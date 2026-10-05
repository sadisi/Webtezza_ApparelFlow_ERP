/**
 * Component: ComponentCountRow
 *
 * Renders a row in the Verification Terminal table for entering and displaying
 * individual component actual counted quantities.
 */

import React, { useState } from 'react';
import { TrafficLightBadge } from './TrafficLightBadge';
import { computeVariance } from '@/src/domain/trafficLight';
import type { VerificationItem, RecipeComponent } from '@/src/types';

export interface VerificationItemWithComponent extends VerificationItem {
  recipe_component?: RecipeComponent;
  recipe_components?: RecipeComponent;
}

interface ComponentCountRowProps {
  item: VerificationItemWithComponent;
  isReadOnly?: boolean;
  isSubmitting?: boolean;
  onSubmitCount: (itemId: string, actualQty: number) => Promise<void>;
}

export function ComponentCountRow({
  item,
  isReadOnly = false,
  isSubmitting = false,
  onSubmitCount,
}: ComponentCountRowProps) {
  const component = item.recipe_component || item.recipe_components;
  const componentName = component?.component_name ?? 'Unknown Component';
  const piecesPerGarment = component?.pieces_per_garment ?? 1;

  const [countInput, setCountInput] = useState<string>(
    item.actual_quantity !== null && item.actual_quantity !== undefined
      ? String(item.actual_quantity)
      : '',
  );
  const [inputError, setInputError] = useState<string | null>(null);

  const variance = computeVariance(item.expected_quantity, item.actual_quantity);

  const formatVariance = (v: number | null) => {
    if (v === null) return '—';
    if (v > 0) return `+${v} pcs (Surplus)`;
    if (v < 0) return `${v} pcs (Shortage)`;
    return '0 pcs (Exact)';
  };

  const getVarianceColor = (v: number | null) => {
    if (v === null) return 'text-slate-500';
    if (v > 0) return 'text-amber-400 font-medium';
    if (v < 0) return 'text-red-400 font-medium';
    return 'text-emerald-400 font-medium';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    if (countInput.trim() === '') {
      setInputError('Count is required');
      return;
    }

    const parsed = Number(countInput);

    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
      setInputError('Count must be a whole number (0 or greater)');
      return;
    }

    try {
      await onSubmitCount(item.id, parsed);
    } catch (err) {
      setInputError(err instanceof Error ? err.message : 'Failed to save count');
    }
  };

  const hasChanged =
    countInput.trim() !== '' &&
    Number(countInput) !== item.actual_quantity &&
    !isNaN(Number(countInput));

  return (
    <tr className="border-b border-slate-800/80 hover:bg-slate-900/50 transition-colors text-xs">
      {/* Component Name */}
      <td className="py-3 px-4 font-semibold text-slate-200">
        <div>{componentName}</div>
        <div className="text-[10px] text-slate-500 font-normal">
          {component?.sort_order ? `Sort #${component.sort_order}` : ''}
        </div>
      </td>

      {/* Pieces Per Garment */}
      <td className="py-3 px-4 text-right text-slate-400 font-mono">
        {piecesPerGarment} pc{piecesPerGarment > 1 ? 's' : ''}/garment
      </td>

      {/* Expected Qty */}
      <td className="py-3 px-4 text-right font-mono font-medium text-slate-200">
        {item.expected_quantity.toLocaleString()} pcs
      </td>

      {/* Actual Qty Input */}
      <td className="py-3 px-4">
        <form onSubmit={handleSave} className="flex flex-col items-end gap-1">
          <div className="flex items-center justify-end gap-2 w-full max-w-[140px]">
            <input
              type="number"
              id={`count-input-${item.id}`}
              name={`count-${item.id}`}
              aria-label={`Actual count for ${componentName}`}
              min="0"
              step="1"
              value={countInput}
              disabled={isReadOnly || isSubmitting}
              onChange={(e) => {
                setCountInput(e.target.value);
                setInputError(null);
              }}
              placeholder="Enter count"
              className="w-28 text-right bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono font-medium text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            />
          </div>
          {inputError && (
            <span className="text-[10px] text-red-400 font-medium">
              {inputError}
            </span>
          )}
        </form>
      </td>

      {/* Variance */}
      <td className={`py-3 px-4 text-right font-mono ${getVarianceColor(variance)}`}>
        {formatVariance(variance)}
      </td>

      {/* Traffic Light */}
      <td className="py-3 px-4 text-center">
        <TrafficLightBadge trafficLight={item.traffic_light} />
      </td>

      {/* Action */}
      <td className="py-3 px-4 text-right">
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanged || isSubmitting}
            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold px-2.5 py-1 rounded transition-colors shadow-sm disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3 w-3 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              'Save Count'
            )}
          </button>
        )}
      </td>
    </tr>
  );
}
