'use client';

/**
 * Page: /cutting-orders
 *
 * Cutting Orders list page.
 * Displays all cutting orders, with filtering by status and search keyword.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { OrderTable } from '@/components/cutting/OrderTable';
import type { CuttingOrderWithDetails } from '@/src/db/queries/orders';
import type { AuthenticatedUser } from '@/src/auth/getServerSession';
import { ROLE_PERMISSIONS } from '@/src/auth/roles';

export default function CuttingOrdersListPage() {
  const [orders, setOrders] = useState<CuttingOrderWithDetails[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = React.useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([fetch('/api/auth/me'), fetch('/api/cutting-orders')])
      .then(async ([meRes, ordersRes]) => {
        if (meRes.ok) {
          const meBody = (await meRes.json()) as { data: AuthenticatedUser };
          setUser(meBody.data);
        }

        if (!ordersRes.ok) {
          const errBody = (await ordersRes.json()) as { error?: string };
          throw new Error(errBody.error ?? 'Failed to fetch cutting orders');
        }

        const ordersBody = (await ordersRes.json()) as { data: CuttingOrderWithDetails[] };
        setOrders(ordersBody.data || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error fetching orders');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([fetch('/api/auth/me'), fetch('/api/cutting-orders')])
      .then(async ([meRes, ordersRes]) => {
        if (!active) return;
        if (meRes.ok) {
          const meBody = (await meRes.json()) as { data: AuthenticatedUser };
          setUser(meBody.data);
        }

        if (!ordersRes.ok) {
          const errBody = (await ordersRes.json()) as { error?: string };
          throw new Error(errBody.error ?? 'Failed to fetch cutting orders');
        }

        const ordersBody = (await ordersRes.json()) as { data: CuttingOrderWithDetails[] };
        if (active) {
          setOrders(ordersBody.data || []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error fetching orders');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Filter orders by status & search term
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const recipeName = order.recipe?.name?.toLowerCase() ?? '';
      const recipeCode = order.recipe?.code?.toLowerCase() ?? '';
      const orderId = order.id.toLowerCase();
      const rollId = order.fabric_roll_id.toLowerCase();

      return (
        recipeName.includes(query) ||
        recipeCode.includes(query) ||
        orderId.includes(query) ||
        rollId.includes(query)
      );
    }

    return true;
  });

  const canCreate = user ? ROLE_PERMISSIONS[user.role]?.canCreateOrder : false;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Cutting Orders
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Garment cutting batch management, fabric consumption, and verification state tracking.
          </p>
        </div>

        {canCreate && (
          <Link
            href="/cutting-orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-sm self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Cutting Order
          </Link>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        {/* Status Filter Tabs / Dropdown */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium">
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'CUTTING_IN_PROGRESS', label: 'Cutting In Progress' },
            { id: 'PENDING_VERIFICATION', label: 'Pending Verification' },
            { id: 'COUNT_QC', label: 'Count QC' },
            { id: 'VERIFIED', label: 'Verified' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'SEWING_IN_PROGRESS', label: 'Sewing In Progress' },
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
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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

      {/* Orders Table */}
      <OrderTable
        orders={filteredOrders}
        loading={loading}
        error={error}
        onRetry={loadData}
      />
    </div>
  );
}
