/**
 * Component: OrderStatusBadge
 *
 * Displays a restrained, ERP-style badge for an order's status.
 */

import React from 'react';
import { clsx } from 'clsx';
import type { OrderStatus } from '@/src/types';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  CUTTING_IN_PROGRESS: {
    label: 'Cutting In Progress',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  COUNT_QC: {
    label: 'Count QC',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  VERIFIED: {
    label: 'Verified',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  SEWING_IN_PROGRESS: {
    label: 'Sewing In Progress',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.badgeClass,
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 shrink-0" />
      {config.label}
    </span>
  );
}
