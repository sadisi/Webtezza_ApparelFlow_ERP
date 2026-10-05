/**
 * DB Queries: Sewing Queue — returns VERIFIED / SEWING_IN_PROGRESS orders only.
 * The status filter is enforced at the query level, not in application code.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CuttingOrder, Recipe, VerificationItem } from '@/src/types';
import { CuttingOrderWithDetails } from './orders';

export type SewingStatusFilter = 'VERIFIED' | 'SEWING_IN_PROGRESS' | 'ALL';

/**
 * Retrieves cutting orders that are eligible for the sewing queue (VERIFIED or SEWING_IN_PROGRESS).
 * Unverified, pending, or rejected orders are strictly filtered out at the DB level.
 *
 * @param client Supabase client
 * @param statusFilter Optional status filter ('VERIFIED', 'SEWING_IN_PROGRESS', or 'ALL')
 */
export async function getSewingQueueOrders(
  client: SupabaseClient,
  statusFilter: SewingStatusFilter = 'ALL',
): Promise<CuttingOrderWithDetails[]> {
  const allowedStatuses =
    statusFilter === 'VERIFIED'
      ? ['VERIFIED']
      : statusFilter === 'SEWING_IN_PROGRESS'
      ? ['SEWING_IN_PROGRESS']
      : ['VERIFIED', 'SEWING_IN_PROGRESS'];

  const { data: orders, error: ordersErr } = await client
    .from('cutting_orders')
    .select('*, recipes(*)')
    .in('status', allowedStatuses)
    .order('updated_at', { ascending: false });

  if (ordersErr || !orders) {
    return [];
  }

  const { data: items } = await client.from('verification_items').select('*');

  return (orders as (CuttingOrder & { recipes?: Recipe })[]).map((order) => {
    const orderItems = (items as VerificationItem[] | null)?.filter(
      (i) => i.cutting_order_id === order.id,
    );

    return {
      id: order.id,
      recipe_id: order.recipe_id,
      created_by: order.created_by,
      fabric_roll_id: order.fabric_roll_id,
      target_quantity: order.target_quantity,
      actual_fabric_used: order.actual_fabric_used,
      expected_fabric: order.expected_fabric,
      wastage_pct: order.wastage_pct,
      status: order.status,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      recipe: order.recipes,
      verification_items: orderItems ?? [],
    };
  });
}
