/**
 * Component: TrafficLightBadge (Verification Domain)
 *
 * Renders a restrained, ERP-style badge for component verification traffic lights:
 *   - GREEN: Exact match (actual === expected)
 *   - YELLOW: Over/Surplus (actual > expected)
 *   - RED: Shortage (actual < expected)
 *   - UNCOUNTED: Not yet counted (actual === null/undefined)
 */

import React from 'react';
import { clsx } from 'clsx';
import type { TrafficLight } from '@/src/types';

interface TrafficLightBadgeProps {
  trafficLight: TrafficLight | null | undefined;
  className?: string;
}

export function TrafficLightBadge({
  trafficLight,
  className,
}: TrafficLightBadgeProps) {
  if (!trafficLight) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700',
          className,
        )}
      >
        <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
        UNCOUNTED — Not Counted
      </span>
    );
  }

  const CONFIG: Record<TrafficLight, { label: string; badgeClass: string; dotClass: string }> = {
    GREEN: {
      label: 'GREEN — Exact',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dotClass: 'bg-emerald-400',
    },
    YELLOW: {
      label: 'YELLOW — Over',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dotClass: 'bg-amber-400',
    },
    RED: {
      label: 'RED — Short',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
      dotClass: 'bg-red-400',
    },
  };

  const config = CONFIG[trafficLight] ?? {
    label: trafficLight,
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    dotClass: 'bg-slate-400',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border',
        config.badgeClass,
        className,
      )}
    >
      <span className={clsx('w-2 h-2 rounded-full shrink-0', config.dotClass)} />
      {config.label}
    </span>
  );
}
