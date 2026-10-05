/**
 * DB Queries: Cutting Orders & Verification Items
 *
 * Handles database operations for creating and retrieving cutting orders
 * and their associated component verification items.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  CuttingOrder,
  VerificationItem,
  Recipe,
  RecipeComponent,
} from '@/src/types';

export interface CreateOrderParams {
  recipe_id: string;
  created_by: string;
  fabric_roll_id: string;
  target_quantity: number;
  actual_fabric_used: number;
  expected_fabric: number;
  wastage_pct: number;
  status: 'CUTTING_IN_PROGRESS';
  notes?: string | null;
}

export interface CreateVerificationItemParam {
  recipe_component_id: string;
  expected_quantity: number;
}

export interface CuttingOrderWithDetails extends CuttingOrder {
  recipe?: Recipe;
  verification_items?: (VerificationItem & { recipe_component?: RecipeComponent })[];
}

/**
 * Inserts a cutting order and its required verification items into Supabase.
 *
 * @param client Supabase client
 * @param orderData Order attributes (expected_fabric, status, created_by server-computed)
 * @param itemsData Verification item attributes (expected_quantity server-computed per component)
 * @returns Created cutting order record with verification items
 */
export async function insertCuttingOrderWithVerificationItems(
  client: SupabaseClient,
  orderData: CreateOrderParams,
  itemsData: CreateVerificationItemParam[],
): Promise<CuttingOrderWithDetails> {
  // 1. Insert Cutting Order
  const { data: order, error: orderErr } = await client
    .from('cutting_orders')
    .insert({
      recipe_id: orderData.recipe_id,
      created_by: orderData.created_by,
      fabric_roll_id: orderData.fabric_roll_id,
      target_quantity: orderData.target_quantity,
      actual_fabric_used: orderData.actual_fabric_used,
      expected_fabric: orderData.expected_fabric,
      wastage_pct: orderData.wastage_pct,
      status: orderData.status,
      notes: orderData.notes ?? null,
    })
    .select('*')
    .single();

  if (orderErr || !order) {
    throw new Error(`Failed to create cutting order: ${orderErr?.message ?? 'Unknown DB error'}`);
  }

  const createdOrder = order as CuttingOrder;

  // 2. Insert Verification Items for each recipe component
  const verificationPayloads = itemsData.map((item) => ({
    cutting_order_id: createdOrder.id,
    recipe_component_id: item.recipe_component_id,
    expected_quantity: item.expected_quantity,
    actual_quantity: null,
    traffic_light: null,
  }));

  const { data: items, error: itemsErr } = await client
    .from('verification_items')
    .insert(verificationPayloads)
    .select('*');

  if (itemsErr || !items) {
    // Attempt rollback of created order
    await client.from('cutting_orders').delete().eq('id', createdOrder.id);
    throw new Error(
      `Failed to create verification items for cutting order: ${itemsErr?.message ?? 'Unknown DB error'}`,
    );
  }

  return {
    ...createdOrder,
    verification_items: items as VerificationItem[],
  };
}

/**
 * Retrieves a single cutting order by ID with recipe details and component verification items.
 */
export async function getCuttingOrderById(
  client: SupabaseClient,
  orderId: string,
): Promise<CuttingOrderWithDetails | null> {
  const { data: order, error: orderErr } = await client
    .from('cutting_orders')
    .select('*, recipes(*)')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return null;
  }

  const { data: items, error: itemsErr } = await client
    .from('verification_items')
    .select('*, recipe_components(*)')
    .eq('cutting_order_id', orderId)
    .order('created_at', { ascending: true });

  const rawOrder = order as CuttingOrder & { recipes?: Recipe };

  return {
    id: rawOrder.id,
    recipe_id: rawOrder.recipe_id,
    created_by: rawOrder.created_by,
    fabric_roll_id: rawOrder.fabric_roll_id,
    target_quantity: rawOrder.target_quantity,
    actual_fabric_used: rawOrder.actual_fabric_used,
    expected_fabric: rawOrder.expected_fabric,
    wastage_pct: rawOrder.wastage_pct,
    status: rawOrder.status,
    notes: rawOrder.notes,
    created_at: rawOrder.created_at,
    updated_at: rawOrder.updated_at,
    recipe: rawOrder.recipes,
    verification_items: itemsErr ? [] : (items as (VerificationItem & { recipe_components?: RecipeComponent })[]).map(
      (item) => ({
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
      }),
    ),
  };
}

/**
 * Lists all cutting orders with recipe details.
 */
export async function listCuttingOrders(
  client: SupabaseClient,
): Promise<CuttingOrderWithDetails[]> {
  const { data: orders, error: ordersErr } = await client
    .from('cutting_orders')
    .select('*, recipes(*)')
    .order('created_at', { ascending: false });

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
