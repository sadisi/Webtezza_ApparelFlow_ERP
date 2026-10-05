/**
 * Page: /cutting-orders/[id]
 *
 * Cutting Order detail page.
 * Displays order summary, server-calculated metrics, recipe metadata,
 * and component verification items table.
 */

export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/src/auth/requireRole';
import { getReadSupabaseClient } from '@/src/db/supabaseClient';
import { getCuttingOrderByIdService } from '@/src/services/cuttingOrderService';
import { OrderStatusBadge } from '@/components/cutting/OrderStatusBadge';
import { TrafficLightBadge } from '@/components/cutting/TrafficLightBadge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CuttingOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Authorize user (cutting_supervisor, cutting_verifier, sewing_supervisor)
  const user = await requireRole(
    'cutting_supervisor',
    'cutting_verifier',
    'sewing_supervisor',
  );

  const supabase = await getReadSupabaseClient();
  let order;
  try {
    order = await getCuttingOrderByIdService(
      id,
      { id: user.id, role: user.role },
      supabase,
    );
  } catch {
    notFound();
  }

  if (!order) {
    notFound();
  }

  const recipe = order.recipe;
  const items = order.verification_items || [];
  const createdDate = order.created_at
    ? new Date(order.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/cutting-orders" className="hover:text-blue-400 transition-colors">
              Cutting Orders
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-200">#{order.id.substring(0, 8)}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Cutting Order Details
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        <Link
          href="/cutting-orders"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Orders
        </Link>
      </div>

      {/* Order Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Core Order Info */}
        <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Order Parameters
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Order ID</span>
              <span className="font-mono text-slate-200 font-medium select-all" title={order.id}>
                {order.id.substring(0, 13)}…
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Target Quantity</span>
              <span className="font-semibold text-slate-100 text-sm">
                {order.target_quantity.toLocaleString()} pcs
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Fabric Roll ID</span>
              <span className="font-mono font-medium text-slate-200">
                {order.fabric_roll_id}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Expected Fabric</span>
              <span className="font-semibold text-slate-100">
                {order.expected_fabric !== null ? `${Number(order.expected_fabric).toFixed(1)} yds` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Actual Fabric Used</span>
              <span className="font-semibold text-slate-100">
                {order.actual_fabric_used !== null ? `${Number(order.actual_fabric_used).toFixed(1)} yds` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Wastage %</span>
              {order.wastage_pct !== null ? (
                <span
                  className={
                    Number(order.wastage_pct) > Number(recipe?.wastage_cap_pct ?? 5)
                      ? 'font-semibold text-red-400'
                      : Number(order.wastage_pct) > 0
                      ? 'font-semibold text-amber-400'
                      : 'font-semibold text-emerald-400'
                  }
                >
                  {Number(order.wastage_pct) > 0 ? '+' : ''}
                  {Number(order.wastage_pct).toFixed(2)}%
                </span>
              ) : (
                '—'
              )}
            </div>
          </div>

          {order.notes && (
            <div className="border-t border-slate-800/80 pt-3 text-xs">
              <span className="text-slate-500 block font-medium mb-0.5">Production Notes:</span>
              <p className="text-slate-300 italic">{order.notes}</p>
            </div>
          )}

          <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-2">
            Created on {createdDate}
          </div>
        </div>

        {/* Recipe Info Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Garment Recipe
          </h2>

          {recipe ? (
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="font-semibold text-slate-100 text-sm">{recipe.name}</div>
                <div className="font-mono text-slate-400 text-[11px]">{recipe.code}</div>
              </div>
              <div className="pt-2 border-t border-slate-800/60 space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-medium">{recipe.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Standard Fabric:</span>
                  <span className="font-medium">{recipe.standard_fabric_yards} yds/pc</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Wastage Cap:</span>
                  <span className="font-medium text-amber-400">+{recipe.wastage_cap_pct}% max</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Recipe information unavailable.</div>
          )}
        </div>
      </div>

      {/* Component Verification Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Component Verification Items
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Server-calculated expected piece counts and verifier count records.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-6">
            No component verification items initialized for this order.
          </div>
        ) : (
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Component</th>
                  <th className="px-4 py-3 text-right">Pcs / Garment</th>
                  <th className="px-4 py-3 text-right">Expected Qty</th>
                  <th className="px-4 py-3 text-right">Actual Count</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-center">QC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {items.map((item) => {
                  const compName =
                    item.recipe_component?.component_name ?? 'Component';
                  const pcsPerGarment =
                    item.recipe_component?.pieces_per_garment ?? '—';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {compName}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 font-mono">
                        {pcsPerGarment}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-100">
                        {item.expected_quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">
                        {item.actual_quantity !== null
                          ? item.actual_quantity.toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {item.variance !== null ? (
                          <span
                            className={
                              item.variance < 0
                                ? 'text-red-400 font-semibold'
                                : item.variance > 0
                                ? 'text-amber-400 font-semibold'
                                : 'text-emerald-400 font-semibold'
                            }
                          >
                            {item.variance > 0 ? '+' : ''}
                            {item.variance}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <TrafficLightBadge trafficLight={item.traffic_light} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
