/**
 * DB Queries: Verification Items & Verification Logs
 *
 * Provides database operations for retrieving terminal verification data,
 * updating component actual counts, writing verification audit logs, and
 * transitioning order statuses.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  CuttingOrder,
  VerificationItem,
  VerificationLog,
  Recipe,
  RecipeComponent,
  TrafficLight,
  OrderStatus,
  VerificationDecision,
} from '@/src/types';

export interface VerificationTerminalData {
  order: CuttingOrder;
  recipe: Recipe;
  items: (VerificationItem & { recipe_component: RecipeComponent })[];
}

/**
 * Retrieves full verification terminal data for a cutting order.
 */
export async function getVerificationTerminalData(
  client: SupabaseClient,
  orderId: string,
): Promise<VerificationTerminalData | null> {
  // 1. Fetch Order with Recipe
  const { data: order, error: orderErr } = await client
    .from('cutting_orders')
    .select('*, recipes(*)')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return null;
  }

  const rawOrder = order as CuttingOrder & { recipes: Recipe };

  // 2. Fetch Verification Items with Recipe Component Details
  const { data: items, error: itemsErr } = await client
    .from('verification_items')
    .select('*, recipe_components(*)')
    .eq('cutting_order_id', orderId)
    .order('created_at', { ascending: true });

  if (itemsErr || !items) {
    return null;
  }

  const formattedItems = (
    items as (VerificationItem & { recipe_components: RecipeComponent })[]
  ).map((item) => ({
    id: item.id,
    cutting_order_id: item.cutting_order_id,
    recipe_component_id: item.recipe_component_id,
    expected_quantity: item.expected_quantity,
    actual_quantity: item.actual_quantity,
    variance: item.variance,
    traffic_light: item.traffic_light,
    counted_at: item.counted_at,
    created_at: item.created_at,
    updated_at: item.updated_at,
    recipe_component: item.recipe_components,
  }));

  return {
    order: rawOrder,
    recipe: rawOrder.recipes,
    items: formattedItems,
  };
}

/**
 * Updates a verification item with the actual count entered by the verifier.
 */
export async function updateVerificationItemCount(
  client: SupabaseClient,
  itemId: string,
  actualQuantity: number,
  trafficLight: TrafficLight,
): Promise<VerificationItem> {
  const { data: updatedItem, error } = await client
    .from('verification_items')
    .update({
      actual_quantity: actualQuantity,
      traffic_light: trafficLight,
      counted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select('*')
    .single();

  if (error || !updatedItem) {
    throw new Error(
      `Failed to update verification item ${itemId}: ${error?.message ?? 'Unknown DB error'}`,
    );
  }

  return updatedItem as VerificationItem;
}

/**
 * Updates the status of a cutting order.
 */
export async function updateCuttingOrderStatus(
  client: SupabaseClient,
  orderId: string,
  status: OrderStatus,
): Promise<CuttingOrder> {
  const { data: updatedOrder, error } = await client
    .from('cutting_orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (error || !updatedOrder) {
    throw new Error(
      `Failed to update order status to '${status}': ${error?.message ?? 'Unknown DB error'}`,
    );
  }

  return updatedOrder as CuttingOrder;
}

export interface CreateVerificationLogParam {
  cutting_order_id: string;
  verifier_id: string;
  decision: VerificationDecision;
  reason?: string | null;
  wastage_pct?: number | null;
  component_snapshot?: unknown;
}

/**
 * Inserts an immutable verification audit log record into public.verification_logs.
 */
export async function insertVerificationLog(
  client: SupabaseClient,
  params: CreateVerificationLogParam,
): Promise<VerificationLog> {
  const { data: log, error } = await client
    .from('verification_logs')
    .insert({
      cutting_order_id: params.cutting_order_id,
      verifier_id: params.verifier_id,
      decision: params.decision,
      reason: params.reason ?? null,
      wastage_pct: params.wastage_pct ?? null,
      component_snapshot: params.component_snapshot ?? null,
    })
    .select('*')
    .single();

  if (error || !log) {
    throw new Error(
      `Failed to insert verification log: ${error?.message ?? 'Unknown DB error'}`,
    );
  }

  return log as VerificationLog;
}
