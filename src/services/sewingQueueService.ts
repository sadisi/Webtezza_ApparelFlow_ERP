/**
 * Application Service: Sewing Queue & Workflow Service
 *
 * Orchestrates sewing queue retrieval, role enforcement, state machine transitions
 * (VERIFIED -> SEWING_IN_PROGRESS), and order detail fetching for sewing supervisors.
 *
 * SECURITY GUARANTEES:
 *   - Only sewing_supervisor role can access the sewing queue or start sewing.
 *   - Status transition VERIFIED -> SEWING_IN_PROGRESS is strictly enforced server-side.
 *   - Unverified, pending, or rejected orders can NEVER enter sewing.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { UserRole, CuttingOrder } from '@/src/types';
import { AuthError } from '@/src/auth/roles';
import { assertValidTransition, NotFoundError } from '@/src/domain';
import {
  getSewingQueueOrders,
  SewingStatusFilter,
} from '@/src/db/queries/sewingQueue';
import {
  getCuttingOrderById,
  CuttingOrderWithDetails,
} from '@/src/db/queries/orders';
import { updateCuttingOrderStatus } from '@/src/db/queries/verification';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

/**
 * Retrieves orders in the sewing queue (VERIFIED or SEWING_IN_PROGRESS).
 */
export async function getSewingQueueService(
  user: AuthenticatedUser,
  client: SupabaseClient,
  statusFilter: SewingStatusFilter = 'ALL',
): Promise<CuttingOrderWithDetails[]> {
  if (!user || user.role !== 'sewing_supervisor') {
    throw new AuthError(
      403,
      'Access denied. Only sewing supervisors can access the sewing queue.',
    );
  }

  return getSewingQueueOrders(client, statusFilter);
}

/**
 * Retrieves details for a specific sewing order.
 */
export async function getSewingOrderDetailService(
  orderId: string,
  user: AuthenticatedUser,
  client: SupabaseClient,
): Promise<CuttingOrderWithDetails> {
  if (!user || user.role !== 'sewing_supervisor') {
    throw new AuthError(
      403,
      'Access denied. Only sewing supervisors can view sewing order details.',
    );
  }

  const order = await getCuttingOrderById(client, orderId);
  if (!order) {
    throw new NotFoundError(`Cutting order with ID '${orderId}' was not found.`);
  }

  return order;
}

/**
 * Transitions a verified order to SEWING_IN_PROGRESS.
 */
export async function startSewingService(
  orderId: string,
  user: AuthenticatedUser,
  client: SupabaseClient,
): Promise<CuttingOrder> {
  // 1. Role Authorization Guard (Only sewing_supervisor can start sewing)
  if (!user || user.role !== 'sewing_supervisor') {
    throw new AuthError(
      403,
      'Access denied. Only sewing supervisors can start sewing production.',
    );
  }

  // 2. Fetch authoritative order from DB
  const order = await getCuttingOrderById(client, orderId);
  if (!order) {
    throw new NotFoundError(`Cutting order with ID '${orderId}' was not found.`);
  }

  // 3. Enforce State Machine Transition (VERIFIED -> SEWING_IN_PROGRESS)
  assertValidTransition(order.status, 'SEWING_IN_PROGRESS');

  // 4. Update order status in DB
  const updatedOrder = await updateCuttingOrderStatus(
    client,
    orderId,
    'SEWING_IN_PROGRESS',
  );

  return updatedOrder;
}
