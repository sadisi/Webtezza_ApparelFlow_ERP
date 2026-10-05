/**
 * Component: TrafficLightBadge
 *
 * Displays a badge for component verification traffic light states (GREEN, YELLOW, RED, UNCOUNTED).
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
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700',
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
        Uncounted
      </span>
    );
  }

  const CONFIG: Record<TrafficLight, { label: string; badgeClass: string }> = {
    GREEN: {
      label: 'GREEN (Exact)',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    YELLOW: {
      label: 'YELLOW (Over)',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    RED: {
      label: 'RED (Shortage)',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
  };

  const config = CONFIG[trafficLight] ?? {
    label: trafficLight,
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border',
        config.badgeClass,
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 shrink-0" />
      {config.label}
    </span>
  );
}
