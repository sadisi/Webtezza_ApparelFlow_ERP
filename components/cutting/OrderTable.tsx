'use client';

/**
 * Component: OrderTable
 *
 * Displays a list of cutting orders in a clean, compact ERP table layout.
 * Includes loading, empty, and error states.
 */

import React from 'react';
import Link from 'next/link';
import { OrderStatusBadge } from '@/components/cutting/OrderStatusBadge';
import type { CuttingOrderWithDetails } from '@/src/db/queries/orders';

interface OrderTableProps {
  orders: CuttingOrderWithDetails[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function OrderTable({
  orders,
  loading = false,
  error = null,
  onRetry,
}: OrderTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
        <div className="inline-flex items-center gap-3 text-slate-400 text-sm font-medium">
          <svg
            className="h-5 w-5 animate-spin text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading cutting orders…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-900/50 text-red-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-red-300">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-xs font-semibold text-white transition-colors"
          >
            Retry Loading
          </button>
        )}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">No Cutting Orders</h3>
          <p className="text-xs text-slate-400 mt-1">
            No cutting orders match the criteria or have been created yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Recipe</th>
              <th className="px-4 py-3 text-right">Target Qty</th>
              <th className="px-4 py-3 text-right">Expected Fabric</th>
              <th className="px-4 py-3 text-right">Actual Fabric</th>
              <th className="px-4 py-3 text-right">Wastage %</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {orders.map((order) => {
              const shortId = order.id.substring(0, 8);
              const createdDate = order.created_at
                ? new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—';

              return (
                <tr
                  key={order.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-200">
                    <span title={order.id}>#{shortId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-200">
                      {order.recipe?.name ?? 'Unknown Recipe'}
                    </div>
                    {order.recipe?.code && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        {order.recipe.code}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-200">
                    {order.target_quantity.toLocaleString()} pcs
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-300">
                    {order.expected_fabric !== null
                      ? `${Number(order.expected_fabric).toFixed(1)} yds`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-300">
                    {order.actual_fabric_used !== null
                      ? `${Number(order.actual_fabric_used).toFixed(1)} yds`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.wastage_pct !== null ? (
                      <span
                        className={
                          Number(order.wastage_pct) > 0
                            ? 'text-amber-400 font-medium'
                            : Number(order.wastage_pct) < 0
                            ? 'text-emerald-400 font-medium'
                            : 'text-slate-300'
                        }
                      >
                        {Number(order.wastage_pct) > 0 ? '+' : ''}
                        {Number(order.wastage_pct).toFixed(2)}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px]">
                    {createdDate}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/cutting-orders/${order.id}`}
                      className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-blue-400 hover:text-blue-300 border border-slate-700 transition-colors"
                    >
                      View
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
