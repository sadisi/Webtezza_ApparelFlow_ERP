/**
 * Component: VerificationTerminal
 *
 * Production Cutting Verifier Verification Terminal workspace.
 * Displays order details, server-authoritative traffic lights, component counting inputs,
 * verification gate summary, and approval/rejection decision controls.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ComponentCountRow } from './ComponentCountRow';
import { OrderStatusBadge } from '@/components/cutting/OrderStatusBadge';
import type {
  CuttingOrder,
  Recipe,
  VerificationItem,
  RecipeComponent,
} from '@/src/types';
import type { VerificationGateResult } from '@/src/domain/trafficLight';
import type { AuthenticatedUser } from '@/src/auth/getServerSession';

export interface TerminalData {
  order: CuttingOrder;
  recipe: Recipe;
  items: (VerificationItem & {
    recipe_component: RecipeComponent;
    recipe_components?: RecipeComponent;
  })[];
  gateResult: VerificationGateResult;
}

interface VerificationTerminalProps {
  orderId: string;
}

export function VerificationTerminal({ orderId }: VerificationTerminalProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [data, setData] = useState<TerminalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mutation states
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Modal & Notification states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    reasons?: string[];
  } | null>(null);

  // Load terminal data from GET /api/cutting-orders/[id]/verification
  const fetchTerminalData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [meRes, termRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/cutting-orders/${orderId}/verification`),
      ]);

      if (meRes.ok) {
        const meJson = (await meRes.json()) as { data: AuthenticatedUser };
        setUser(meJson.data);
      }

      if (!termRes.ok) {
        const errJson = (await termRes.json()) as { error?: string };
        throw new Error(errJson.error ?? 'Failed to load verification terminal');
      }

      const termJson = (await termRes.json()) as { data: TerminalData };
      setData(termJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred loading terminal');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch('/api/auth/me'),
      fetch(`/api/cutting-orders/${orderId}/verification`),
    ])
      .then(async ([meRes, termRes]) => {
        if (!active) return;

        if (meRes.ok) {
          const meJson = (await meRes.json()) as { data: AuthenticatedUser };
          setUser(meJson.data);
        }

        if (!termRes.ok) {
          const errJson = (await termRes.json()) as { error?: string };
          throw new Error(errJson.error ?? 'Failed to load verification terminal');
        }

        const termJson = (await termRes.json()) as { data: TerminalData };
        if (active) {
          setData(termJson.data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'An error occurred loading terminal');
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

  // Submit single component count
  const handleCountSubmit = async (itemId: string, actualQuantity: number) => {
    setSubmittingItemId(itemId);
    setNotification(null);

    try {
      const res = await fetch(`/api/cutting-orders/${orderId}/verification/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_item_id: itemId,
          actual_quantity: actualQuantity,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Failed to submit component count');
      }

      // Re-fetch server terminal data to maintain absolute server authority
      await fetchTerminalData();
      setNotification({
        type: 'success',
        message: 'Component count updated successfully.',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error recording count',
      });
      throw err;
    } finally {
      setSubmittingItemId(null);
    }
  };

  // Approve verification batch
  const handleApprove = async () => {
    setIsApproving(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/cutting-orders/${orderId}/verification/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const body = await res.json();

      if (!res.ok) {
        if (res.status === 422 && body.reasons) {
          setNotification({
            type: 'error',
            message:
              'Verification cannot be approved because one or more components require attention.',
            reasons: body.reasons,
          });
          return;
        }
        throw new Error(body.error || 'Approval failed');
      }

      setNotification({
        type: 'success',
        message: body.message || 'Order successfully verified and approved for sewing queue.',
      });

      await fetchTerminalData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to approve verification',
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Reject verification batch
  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setRejectError(null);

    if (!rejectReason.trim()) {
      setRejectError('Rejection reason is required.');
      return;
    }

    setIsRejecting(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/cutting-orders/${orderId}/verification/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Rejection failed');
      }

      setNotification({
        type: 'success',
        message: body.message || 'Order verification rejected.',
      });

      setRejectModalOpen(false);
      setRejectReason('');
      await fetchTerminalData();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : 'Failed to reject verification');
    } finally {
      setIsRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="h-32 bg-slate-900 rounded-xl border border-slate-800" />
        <div className="h-64 bg-slate-900 rounded-xl border border-slate-800" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Verification Terminal Error</h2>
        <p className="text-sm text-slate-400">{error || 'Cutting order not found'}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={fetchTerminalData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Retry Loading
          </button>
          <Link
            href="/verification"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  const { order, recipe, items, gateResult } = data;
  const isVerifier = user?.role === 'cutting_verifier';
  const isFinalized = order.status === 'VERIFIED' || order.status === 'REJECTED';
  const isReadOnly = !isVerifier || isFinalized;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/verification"
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Verification Queue
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-400 font-mono">{order.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Verification Terminal
            <OrderStatusBadge status={order.status} />
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/cutting-orders/${order.id}`}
            className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Order Details
          </Link>
        </div>
      </div>

      {/* Role Notice if non-verifier */}
      {!isVerifier && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            You are viewing this terminal as <strong>{user?.role}</strong>. Count entry, approval, and rejection are restricted to <strong>Cutting Verifiers</strong>.
          </span>
        </div>
      )}

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {notification.type === 'success' ? (
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>

          {notification.reasons && notification.reasons.length > 0 && (
            <ul className="list-disc list-inside space-y-1 pl-6 text-red-400">
              {notification.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Order Summary & Fabric Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recipe & Order Identity */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Order Metadata
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{recipe?.name}</div>
            <div className="text-xs text-slate-400 font-mono">Code: {recipe?.code}</div>
            <div className="text-xs text-slate-400">Category: {recipe?.category}</div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <div>Target Garments: <span className="font-mono text-white font-semibold">{order.target_quantity.toLocaleString()} pcs</span></div>
            <div>Fabric Roll: <span className="font-mono text-slate-300">{order.fabric_roll_id}</span></div>
          </div>
        </div>

        {/* Fabric Consumption */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Fabric Consumption
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-slate-500">Expected Fabric</div>
              <div className="font-mono font-medium text-slate-200">
                {order.expected_fabric.toFixed(2)} yds
              </div>
            </div>
            <div>
              <div className="text-slate-500">Actual Fabric Used</div>
              <div className="font-mono font-medium text-slate-200">
                {order.actual_fabric_used.toFixed(2)} yds
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-slate-500">Wastage %</div>
              <div className="font-mono font-semibold text-amber-400">
                {order.wastage_pct !== null ? `${order.wastage_pct.toFixed(2)}%` : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Wastage Cap</div>
              <div className="font-mono font-semibold text-slate-300">
                {recipe?.wastage_cap_pct}%
              </div>
            </div>
          </div>
        </div>

        {/* Gate Status Quick View */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Verification Status
          </div>
          <div className="text-xs text-slate-300 font-medium">
            Components Counted:{' '}
            <span className="font-mono font-bold text-white">
              {gateResult.countedComponents} / {gateResult.totalComponents}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono">
              GREEN: {gateResult.greenCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono">
              YELLOW: {gateResult.yellowCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-mono">
              RED: {gateResult.redCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-mono">
              UNCOUNTED: {gateResult.uncountedCount}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs">
            <span className="text-slate-400">Approval State: </span>
            {gateResult.canApprove ? (
              <span className="font-semibold text-emerald-400">Allowed</span>
            ) : (
              <span className="font-semibold text-red-400">Blocked</span>
            )}
          </div>
        </div>
      </div>

      {/* Verification Gate Summary Banner */}
      <div
        className={`p-4 rounded-xl border space-y-2 ${
          gateResult.canApprove
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {gateResult.canApprove ? (
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            ) : (
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400" />
            )}
            <h3 className="text-sm font-semibold text-white">
              {gateResult.canApprove
                ? 'Verification Gate Passed — Approval Allowed'
                : 'Verification Gate Active — Approval Blocked'}
            </h3>
          </div>
          <span className="text-xs font-mono font-medium text-slate-300">
            {gateResult.countedComponents} of {gateResult.totalComponents} components counted
          </span>
        </div>

        {!gateResult.canApprove && gateResult.reasons.length > 0 && (
          <div className="pt-2 border-t border-amber-500/20 text-xs text-amber-200/90">
            <div className="font-medium mb-1 text-amber-300">Reasons preventing approval:</div>
            <ul className="list-disc list-inside space-y-0.5 pl-2 font-mono text-[11px]">
              {gateResult.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Component Verification Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Component Counting Verification</h2>
            <p className="text-xs text-slate-400">
              Enter actual counted piece quantities for each recipe component. Traffic light status and variances are server-computed.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4 text-right">Pieces / Garment</th>
                <th className="py-3 px-4 text-right">Expected Qty</th>
                <th className="py-3 px-4 text-right">Actual Qty Input</th>
                <th className="py-3 px-4 text-right">Variance</th>
                <th className="py-3 px-4 text-center">Traffic Light</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No component items recorded for this cutting order.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <ComponentCountRow
                    key={`${item.id}_${item.actual_quantity ?? 'null'}`}
                    item={item}
                    isReadOnly={isReadOnly}
                    isSubmitting={submittingItemId === item.id}
                    onSubmitCount={handleCountSubmit}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Terminal Actions Footer */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {isFinalized ? (
            <div className="text-xs text-slate-400">
              This order has been finalized with status{' '}
              <strong className="text-white">{order.status}</strong>. Verification editing is disabled.
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Submit all component counts. Approval requires all components counted without RED shortages.
            </div>
          )}
        </div>

        {!isFinalized && isVerifier && (
          <div className="flex items-center gap-3 shrink-0">
            {/* Reject Action */}
            <button
              type="button"
              onClick={() => {
                setRejectReason('');
                setRejectError(null);
                setRejectModalOpen(true);
              }}
              disabled={isApproving || isRejecting}
              className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              Reject Verification
            </button>

            {/* Approve Action */}
            <button
              type="button"
              onClick={handleApprove}
              disabled={!gateResult.canApprove || isApproving || isRejecting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isApproving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Approving…
                </>
              ) : (
                'Approve Verification'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white">Reject Verification Batch</h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Provide a mandatory reason for rejecting this verification batch. The rejection will be logged in the immutable audit log and the order status will transition to REJECTED.
            </p>

            <form onSubmit={handleRejectConfirm} className="space-y-4">
              <div>
                <label htmlFor="rejection-reason-input" className="block text-xs font-semibold text-slate-300 mb-1">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="rejection-reason-input"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setRejectError(null);
                  }}
                  placeholder="e.g. Fabric defect on front panels, missing component pieces…"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-medium text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-xs"
                />
                {rejectError && (
                  <p className="text-[11px] text-red-400 mt-1 font-medium">{rejectError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={isRejecting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  {isRejecting ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Rejecting…
                    </>
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
