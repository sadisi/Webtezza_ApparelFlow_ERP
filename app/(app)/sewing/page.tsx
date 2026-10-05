'use client';

/**
 * Page: /sewing
 *
 * Sewing Supervisor Sewing Queue page.
 * Lists orders eligible for sewing (VERIFIED and SEWING_IN_PROGRESS).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SewingQueueTable } from '@/components/sewing/SewingQueueTable';
import type { CuttingOrderWithDetails } from '@/src/db/queries/orders';
import type { AuthenticatedUser } from '@/src/auth/getServerSession';
import { ROLE_PERMISSIONS } from '@/src/auth/roles';

export default function SewingQueuePage() {
  const [orders, setOrders] = useState<CuttingOrderWithDetails[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingOrderId, setStartingOrderId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([fetch('/api/auth/me'), fetch('/api/sewing/orders')])
      .then(async ([meRes, ordersRes]) => {
        if (meRes.ok) {
          const meBody = (await meRes.json()) as { data: AuthenticatedUser };
          setUser(meBody.data);
        }

        if (!ordersRes.ok) {
          const errBody = (await ordersRes.json()) as { error?: string };
          throw new Error(errBody.error ?? 'Failed to fetch sewing queue');
        }

        const ordersBody = (await ordersRes.json()) as {
          data: CuttingOrderWithDetails[];
        };
        setOrders(ordersBody.data || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error fetching sewing queue');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([fetch('/api/auth/me'), fetch('/api/sewing/orders')])
      .then(async ([meRes, ordersRes]) => {
        if (!active) return;

        if (meRes.ok) {
          const meBody = (await meRes.json()) as { data: AuthenticatedUser };
          setUser(meBody.data);
        }

        if (!ordersRes.ok) {
          const errBody = (await ordersRes.json()) as { error?: string };
          throw new Error(errBody.error ?? 'Failed to fetch sewing queue');
        }

        const ordersBody = (await ordersRes.json()) as {
          data: CuttingOrderWithDetails[];
        };
        if (active) {
          setOrders(ordersBody.data || []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error fetching sewing queue');
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

  const handleStartSewing = async (orderId: string) => {
    setStartingOrderId(orderId);

    try {
      const res = await fetch(`/api/cutting-orders/${orderId}/sewing/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Failed to start sewing');
      }

      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start sewing');
    } finally {
      setStartingOrderId(null);
    }
  };

  const hasPermission = user
    ? ROLE_PERMISSIONS[user.role]?.canAccessSewingQueue
    : true; // Default true while loading to avoid flash

  if (user && !hasPermission) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400">
          The Sewing Queue is restricted to <strong>Sewing Supervisors</strong>. Your current role is <strong>{user.role}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Sewing Queue
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Sewing Supervisor work queue. Surfaces orders that have successfully passed cutting verification and are ready for sewing production.
        </p>
      </div>

      {/* Queue Table */}
      <SewingQueueTable
        orders={orders}
        loading={loading}
        error={error}
        onRetry={loadData}
        onStartSewing={handleStartSewing}
        startingOrderId={startingOrderId}
      />
    </div>
  );
}
