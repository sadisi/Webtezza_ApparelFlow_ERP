/**
 * Application Service: Cutting Order Service
 *
 * Orchestrates cutting order creation and retrieval workflows:
 *   1. Role authorization checks
 *   2. Zod request validation
 *   3. DB recipe retrieval
 *   4. Authoritative domain calculations (expected fabric, wastage, expected piece counts)
 *   5. Atomic DB insertion of order + verification items
 *
 * SECURITY GUARANTEES:
 *   - Never trusts client-supplied expected_quantity, expected_fabric, status, or role.
 *   - Forces initial status to 'CUTTING_IN_PROGRESS'.
 *   - Forces creator ID to authenticated user's ID.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { UserRole } from '@/src/types';
import { AuthError } from '@/src/auth/roles';
import { createOrderSchema, CreateOrderInput } from '@/src/validation/orderSchemas';
import {
  calculateExpectedFabric,
  calculateWastagePct,
  calculateExpectedQuantity,
  NotFoundError,
  DomainError,
} from '@/src/domain';
import { getRecipeWithComponents } from '@/src/db/queries/recipes';
import {
  insertCuttingOrderWithVerificationItems,
  getCuttingOrderById,
  listCuttingOrders,
  CuttingOrderWithDetails,
  CreateVerificationItemParam,
} from '@/src/db/queries/orders';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

/**
 * Creates a new cutting order and initializes its component verification items.
 *
 * @param rawInput Request body
 * @param user Authenticated user context
 * @param client Supabase client instance
 */
export async function createCuttingOrderService(
  rawInput: unknown,
  user: AuthenticatedUser,
  client: SupabaseClient,
): Promise<CuttingOrderWithDetails> {
  // 1. Role Authorization Guard (Only cutting_supervisor can create cutting orders)
  if (!user || user.role !== 'cutting_supervisor') {
    throw new AuthError(
      403,
      'Access denied. Only cutting supervisors can create cutting orders.',
    );
  }

  // 2. Validate input using Zod
  const input: CreateOrderInput = createOrderSchema.parse(rawInput);

  // 3. Retrieve Recipe from Database (Never trust client recipe metadata)
  const recipeResult = await getRecipeWithComponents(client, input.recipe_id);
  if (!recipeResult) {
    throw new NotFoundError(`Recipe with ID '${input.recipe_id}' was not found.`);
  }

  const { recipe, components } = recipeResult;

  if (!components || components.length === 0) {
    throw new DomainError(
      `Recipe '${recipe.name}' (${recipe.code}) has no defined components. Cannot create cutting order.`,
    );
  }

  // 4. Authoritative Domain Calculations
  // Expected fabric yards = standard_fabric_yards × target_quantity
  const expectedFabric = calculateExpectedFabric(
    Number(recipe.standard_fabric_yards),
    input.target_quantity,
  );

  // Wastage % = ((actual_fabric_used - expected_fabric) / expected_fabric) × 100
  const wastagePct = calculateWastagePct(
    input.actual_fabric_used,
    expectedFabric,
  );

  // Calculate expected quantity for every component = target_quantity × pieces_per_garment
  const verificationItemsPayload: CreateVerificationItemParam[] = components.map(
    (component) => {
      const expectedQuantity = calculateExpectedQuantity(
        input.target_quantity,
        component.pieces_per_garment,
      );

      return {
        recipe_component_id: component.id,
        expected_quantity: expectedQuantity,
      };
    },
  );

  // 5. Atomic DB Insertion with Server-Enforced Initial State
  const createdOrder = await insertCuttingOrderWithVerificationItems(
    client,
    {
      recipe_id: input.recipe_id,
      created_by: user.id,
      fabric_roll_id: input.fabric_roll_id,
      target_quantity: input.target_quantity,
      actual_fabric_used: input.actual_fabric_used,
      expected_fabric: expectedFabric,
      wastage_pct: wastagePct,
      status: 'CUTTING_IN_PROGRESS', // Server-determined state
      notes: input.notes,
    },
    verificationItemsPayload,
  );

  return createdOrder;
}

/**
 * Lists cutting orders for authorized roles.
 */
export async function listCuttingOrdersService(
  user: AuthenticatedUser,
  client: SupabaseClient,
): Promise<CuttingOrderWithDetails[]> {
  const allowedRoles: UserRole[] = [
    'cutting_supervisor',
    'cutting_verifier',
    'sewing_supervisor',
  ];

  if (!user || !allowedRoles.includes(user.role)) {
    throw new AuthError(
      403,
      'Access denied. Insufficient permissions to view cutting orders.',
    );
  }

  return listCuttingOrders(client);
}

/**
 * Retrieves single cutting order details by ID for authorized roles.
 */
export async function getCuttingOrderByIdService(
  orderId: string,
  user: AuthenticatedUser,
  client: SupabaseClient,
): Promise<CuttingOrderWithDetails> {
  const allowedRoles: UserRole[] = [
    'cutting_supervisor',
    'cutting_verifier',
    'sewing_supervisor',
  ];

  if (!user || !allowedRoles.includes(user.role)) {
    throw new AuthError(
      403,
      'Access denied. Insufficient permissions to view order details.',
    );
  }

  const order = await getCuttingOrderById(client, orderId);
  if (!order) {
    throw new NotFoundError(`Cutting order with ID '${orderId}' was not found.`);
  }

  return order;
}
