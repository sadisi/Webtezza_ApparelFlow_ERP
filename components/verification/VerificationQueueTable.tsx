/**
 * Component: VerificationQueueTable
 *
 * Renders the Cutting Verifier queue table listing cutting orders relevant to verification.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { OrderStatusBadge } from '@/components/cutting/OrderStatusBadge';
import type { CuttingOrderWithDetails } from '@/src/db/queries/orders';

interface VerificationQueueTableProps {
  orders: CuttingOrderWithDetails[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function VerificationQueueTable({
  orders,
  loading,
  error,
  onRetry,
}: VerificationQueueTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_VERIFICATION');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter orders for verification relevance
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const recipeName = order.recipe?.name?.toLowerCase() ?? '';
      const recipeCode = order.recipe?.code?.toLowerCase() ?? '';
      const orderId = order.id.toLowerCase();
      const rollId = order.fabric_roll_id.toLowerCase();

      return (
        recipeName.includes(q) ||
        recipeCode.includes(q) ||
        orderId.includes(q) ||
        rollId.includes(q)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-3">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        <div className="text-xs">Loading verification queue…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-3">
        <div className="text-sm font-semibold text-red-400">Failed to load verification queue</div>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls / Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium">
          {[
            { id: 'PENDING_VERIFICATION', label: 'Pending Verification' },
            { id: 'COUNT_QC', label: 'Count QC' },
            { id: 'CUTTING_IN_PROGRESS', label: 'Cutting In Progress' },
            { id: 'VERIFIED', label: 'Verified' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'ALL', label: 'All Orders' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`
                px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors
                ${
                  statusFilter === tab.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <input
            type="text"
            placeholder="Search recipe, ID, roll…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-700 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
          />
          <svg
            className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Recipe</th>
                <th className="py-3.5 px-4 text-right">Target Qty</th>
                <th className="py-3.5 px-4 text-right">Expected Fabric</th>
                <th className="py-3.5 px-4 text-right">Wastage %</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No orders matching the selected status or search query.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      {order.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">
                        {order.recipe?.name ?? '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {order.recipe?.code} ({order.recipe?.category})
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                      {order.target_quantity.toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      {order.expected_fabric.toFixed(2)} yds
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-400">
                      {order.wastage_pct !== null ? `${order.wastage_pct.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/verification/${order.id}`}
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                      >
                        Open Terminal
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
