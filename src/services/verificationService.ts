/**
 * Application Service: Verification Service & Approval Gateway
 *
 * Orchestrates component count submissions, server-side traffic light re-computations,
 * verification gate checks, order status state transitions, and audit logging.
 *
 * SECURITY GUARANTEES:
 *   - Only cutting_verifier role can submit counts, approve, or reject.
 *   - Traffic lights and approval decisions are ALWAYS computed server-side using Phase 3 domain rules.
 *   - Any RED or uncounted component hard-stops approval — browser CANNOT override.
 *   - Verifier identity is ALWAYS sourced from the authenticated server session.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { UserRole } from '@/src/types';
import { AuthError } from '@/src/auth/roles';
import {
  computeTrafficLight,
  evaluateVerificationGate,
  assertCanApproveVerification,
  assertValidTransition,
  NotFoundError,
  VerificationItemInput,
} from '@/src/domain';
import {
  componentCountSchema,
  rejectVerificationSchema,
} from '@/src/validation/verificationSchemas';
import {
  getVerificationTerminalData,
  updateVerificationItemCount,
  updateCuttingOrderStatus,
  insertVerificationLog,
  VerificationTerminalData,
} from '@/src/db/queries/verification';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

export interface RecordCountInput {
  verification_item_id: string;
  actual_quantity: number;
}

/**
 * Retrieves full verification terminal data for a cutting order with server-calculated traffic lights.
 */
export async function getVerificationTerminalService(
  orderId: string,
  user: AuthenticatedUser,
  client: SupabaseClient,
): Promise<VerificationTerminalData & { gateResult: ReturnType<typeof evaluateVerificationGate> }> {
  const allowedRoles: UserRole[] = [
    'cutting_supervisor',
    'cutting_verifier',
    'sewing_supervisor',
  ];

  if (!user || !allowedRoles.includes(user.role)) {
    throw new AuthError(
      403,
      'Access denied. Insufficient permissions to access verification terminal.',
    );
  }

  const data = await getVerificationTerminalData(client, orderId);
  if (!data) {
    throw new NotFoundError(`Cutting order with ID '${orderId}' was not found.`);
  }

  // Re-compute traffic lights server-side for accurate display
  const itemsWithComputedLights = data.items.map((item) => {
    const computedLight = computeTrafficLight(
      item.expected_quantity,
      item.actual_quantity,
    );
    return {
      ...item,
      traffic_light: computedLight,
    };
  });

  const gateInput: VerificationItemInput[] = itemsWithComputedLights.map((item) => ({
    id: item.id,
    component_name: item.recipe_component.component_name,
    expected_quantity: item.expected_quantity,
    actual_quantity: item.actual_quantity,
  }));

  const gateResult = evaluateVerificationGate(gateInput);

  return {
    ...data,
    items: itemsWithComputedLights,
    gateResult,
  };
}

/**
 * Records a verifier's actual component count submission.
 */
export async function recordComponentCountService(
  rawInput: unknown,
  orderId: string,
  verifier: AuthenticatedUser,
  client: SupabaseClient,
) {
  // 1. Role Authorization Guard (Only cutting_verifier can record counts)
  if (!verifier || verifier.role !== 'cutting_verifier') {
    throw new AuthError(
      403,
      'Access denied. Only cutting verifiers can record component counts.',
    );
  }

  // 2. Validate input using Zod
  const body = rawInput as RecordCountInput;
  const countInput = componentCountSchema.parse({
    actual_quantity: body.actual_quantity,
  });

  const itemId = body.verification_item_id;
  if (!itemId || typeof itemId !== 'string') {
    throw new Error('Verification Item ID is required.');
  }

  // 3. Fetch terminal data to locate item and verify expected_quantity from DB
  const terminalData = await getVerificationTerminalData(client, orderId);
  if (!terminalData) {
    throw new NotFoundError(`Cutting order with ID '${orderId}' was not found.`);
  }

  const targetItem = terminalData.items.find((i) => i.id === itemId);
  if (!targetItem) {
    throw new NotFoundError(
      `Verification item with ID '${itemId}' was not found in order '${orderId}'.`,
    );
  }

  // 4. Calculate Traffic Light Server-Side using Authoritative DB expected_quantity
  const computedTrafficLight = computeTrafficLight(
    targetItem.expected_quantity,
    countInput.actual_quantity,
  );

  if (!computedTrafficLight) {
    throw new Error('Failed to compute valid traffic light for count submission.');
  }

  // 5. Update Verification Item
  const updatedItem = await updateVerificationItemCount(
    client,
    itemId,
    countInput.actual_quantity,
    computedTrafficLight,
  );

  // 6. Transition order to PENDING_VERIFICATION if currently CUTTING_IN_PROGRESS or REJECTED
  const currentStatus = terminalData.order.status;
  if (currentStatus === 'CUTTING_IN_PROGRESS' || currentStatus === 'REJECTED') {
    assertValidTransition(currentStatus, 'PENDING_VERIFICATION');
    await updateCuttingOrderStatus(client, orderId, 'PENDING_VERIFICATION');
  }

  return updatedItem;
}

/**
 * Executes the Hard-Stop Production Approval Gateway.
 */
export async function approveVerificationService(
  orderId: string,
  verifier: AuthenticatedUser,
  client: SupabaseClient,
) {
  // 1. Role Guard
  if (!verifier || verifier.role !== 'cutting_verifier') {
    throw new AuthError(
      403,
      'Access denied. Only cutting verifiers can approve verification batches.',
    );
  }

  // 2. Retrieve Terminal Data
  const terminalData = await getVerificationTerminalData(client, orderId);
  if (!terminalData) {
    throw new NotFoundError(`Cutting order with ID '${orderId}' was not found.`);
  }

  const { order, items } = terminalData;

  // 3. Assemble Verification Gate Inputs with Server-Calculated Traffic Lights
  const gateItems: VerificationItemInput[] = items.map((item) => ({
    id: item.id,
    component_name: item.recipe_component?.component_name,
    expected_quantity: item.expected_quantity,
    actual_quantity: item.actual_quantity,
  }));

  // 4. Execute Hard-Stop Gate (Throws VerificationGateError if any RED or uncounted item)
  assertCanApproveVerification(gateItems);

  // 5. Enforce Order State Machine Transition (PENDING_VERIFICATION -> VERIFIED)
  assertValidTransition(order.status, 'VERIFIED');

  // 6. Update Order Status
  const updatedOrder = await updateCuttingOrderStatus(client, orderId, 'VERIFIED');

  // 7. Write Immutable Audit Log
  const auditLog = await insertVerificationLog(client, {
    cutting_order_id: orderId,
    verifier_id: verifier.id, // Sourced strictly from authenticated server session
    decision: 'APPROVED',
    reason: null,
    wastage_pct: order.wastage_pct,
    component_snapshot: items,
  });

  return {
    order: updatedOrder,
    log: auditLog,
    gateResult: evaluateVerificationGate(gateItems),
  };
}

/**
 * Rejects a verification batch.
 */
export async function rejectVerificationService(
  rawInput: unknown,
  orderId: string,
  verifier: AuthenticatedUser,
  client: SupabaseClient,
) {
  // 1. Role Guard
  if (!verifier || verifier.role !== 'cutting_verifier') {
    throw new AuthError(
      403,
      'Access denied. Only cutting verifiers can reject verification batches.',
    );
  }

  // 2. Validate Rejection Reason using Zod
  const input = rejectVerificationSchema.parse(rawInput);

  // 3. Fetch Order
  const terminalData = await getVerificationTerminalData(client, orderId);
  if (!terminalData) {
    throw new NotFoundError(`Cutting order with ID '${orderId}' was not found.`);
  }

  const { order, items } = terminalData;

  // 4. Enforce State Machine Transition (PENDING_VERIFICATION -> REJECTED)
  assertValidTransition(order.status, 'REJECTED');

  // 5. Update Order Status
  const updatedOrder = await updateCuttingOrderStatus(client, orderId, 'REJECTED');

  // 6. Write Immutable Audit Log
  const auditLog = await insertVerificationLog(client, {
    cutting_order_id: orderId,
    verifier_id: verifier.id, // Sourced strictly from authenticated server session
    decision: 'REJECTED',
    reason: input.reason,
    wastage_pct: order.wastage_pct,
    component_snapshot: items,
  });

  return {
    order: updatedOrder,
    log: auditLog,
  };
}
