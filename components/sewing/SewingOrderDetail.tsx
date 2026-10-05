/**
 * Component: SewingOrderDetail
 *
 * Detailed inspection & production start view for a single order in the Sewing workflow.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { OrderStatusBadge } from '@/components/cutting/OrderStatusBadge';
import { TrafficLightBadge } from '@/components/verification/TrafficLightBadge';
import type { CuttingOrderWithDetails } from '@/src/db/queries/orders';
import type { AuthenticatedUser } from '@/src/auth/getServerSession';

interface SewingOrderDetailProps {
  orderId: string;
}

export function SewingOrderDetail({ orderId }: SewingOrderDetailProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [order, setOrder] = useState<CuttingOrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrderData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [meRes, orderRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/cutting-orders/${orderId}`),
      ]);

      if (meRes.ok) {
        const meJson = (await meRes.json()) as { data: AuthenticatedUser };
        setUser(meJson.data);
      }

      if (!orderRes.ok) {
        const errJson = (await orderRes.json()) as { error?: string };
        throw new Error(errJson.error ?? 'Failed to load order details');
      }

      const orderJson = (await orderRes.json()) as { data: CuttingOrderWithDetails };
      setOrder(orderJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let active = true;

    Promise.all([fetch('/api/auth/me'), fetch(`/api/cutting-orders/${orderId}`)])
      .then(async ([meRes, orderRes]) => {
        if (!active) return;

        if (meRes.ok) {
          const meJson = (await meRes.json()) as { data: AuthenticatedUser };
          setUser(meJson.data);
        }

        if (!orderRes.ok) {
          const errJson = (await orderRes.json()) as { error?: string };
          throw new Error(errJson.error ?? 'Failed to load order details');
        }

        const orderJson = (await orderRes.json()) as { data: CuttingOrderWithDetails };
        if (active) {
          setOrder(orderJson.data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error fetching order');
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
  }, [orderId]);

  const handleStartSewing = async () => {
    setIsStarting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/cutting-orders/${orderId}/sewing/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Failed to start sewing production');
      }

      setActionSuccess('Order successfully transitioned to SEWING_IN_PROGRESS.');
      await fetchOrderData();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'This order cannot be started for sewing in its current state.',
      );
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="h-32 bg-slate-900 rounded-xl border border-slate-800" />
        <div className="h-48 bg-slate-900 rounded-xl border border-slate-800" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Sewing Order Error</h2>
        <p className="text-sm text-slate-400">{error || 'Order not found'}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={fetchOrderData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Retry Loading
          </button>
          <Link
            href="/sewing"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Back to Sewing Queue
          </Link>
        </div>
      </div>
    );
  }

  const recipe = order.recipe;
  const items = order.verification_items || [];
  const isSewingSupervisor = user?.role === 'sewing_supervisor';
  const isVerified = order.status === 'VERIFIED';
  const isSewingInProgress = order.status === 'SEWING_IN_PROGRESS';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/sewing" className="hover:text-emerald-400 transition-colors">
              Sewing Queue
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-200">#{order.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Sewing Order Inspection
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        <Link
          href="/sewing"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Sewing Queue
        </Link>
      </div>

      {/* Role Alert */}
      {!isSewingSupervisor && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            You are viewing this order as <strong>{user?.role}</strong>. Starting sewing is restricted to <strong>Sewing Supervisors</strong>.
          </span>
        </div>
      )}

      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{actionError}</span>
        </div>
      )}

      {/* Production Control Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Sewing Production Control</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isVerified
              ? 'This order has passed verification and is ready to enter the sewing line.'
              : isSewingInProgress
              ? 'Sewing production is currently in progress for this order.'
              : 'This order is not in a verified state and cannot be started for sewing.'}
          </p>
        </div>

        {isSewingSupervisor && (
          <div className="shrink-0">
            {isVerified ? (
              <button
                type="button"
                onClick={handleStartSewing}
                disabled={isStarting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold rounded-lg transition-colors shadow-sm inline-flex items-center gap-2"
              >
                {isStarting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Starting Sewing…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Sewing
                  </>
                )}
              </button>
            ) : isSewingInProgress ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Sewing In Progress
              </span>
            ) : (
              <button
                disabled
                className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-semibold rounded-lg cursor-not-allowed"
              >
                Start Sewing (Blocked)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Core Order Info */}
        <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Order Parameters
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Order ID</span>
              <span className="font-mono text-slate-200 font-medium select-all">
                {order.id}
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
                <span className="font-semibold text-amber-400">
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

      {/* Component Verification Snapshot Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Component Verification Snapshot
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified piece counts and component traffic light results from cutting verification.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-6">
            No component verification items available.
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
                  const comp = item.recipe_component;
                  const compName = comp?.component_name ?? 'Component';
                  const pcsPerGarment = comp?.pieces_per_garment ?? '—';

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
