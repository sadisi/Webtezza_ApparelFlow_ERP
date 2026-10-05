'use client';

/**
 * Component: OrderForm
 *
 * Form for creating a new cutting order.
 * Fetches recipes from /api/recipes.
 * Sends ONLY user-controlled inputs to POST /api/cutting-orders.
 * Authoritative values (expected fabric, wastage, component counts, status) are computed server-side.
 */

import React, { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { RecipeWithComponents } from '@/src/db/queries/recipes';

export function OrderForm() {
  const router = useRouter();

  // Recipe data state
  const [recipes, setRecipes] = useState<RecipeWithComponents[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  // Form input state
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [targetQuantity, setTargetQuantity] = useState<string>('100');
  const [fabricRollId, setFabricRollId] = useState<string>('ROLL-A-101');
  const [actualFabricUsed, setActualFabricUsed] = useState<string>('185');
  const [notes, setNotes] = useState<string>('');

  // Submit & Error state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load recipes on mount
  useEffect(() => {
    async function loadRecipes() {
      try {
        setLoadingRecipes(true);
        setRecipeError(null);

        const res = await fetch('/api/recipes');
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? 'Failed to load garment recipes');
        }

        const body = (await res.json()) as { data: RecipeWithComponents[] };
        setRecipes(body.data || []);
        if (body.data && body.data.length > 0 && body.data[0]?.recipe) {
          setSelectedRecipeId(body.data[0].recipe.id);
        }
      } catch (err) {
        setRecipeError(
          err instanceof Error ? err.message : 'Error loading recipes',
        );
      } finally {
        setLoadingRecipes(false);
      }
    }

    loadRecipes();
  }, []);

  // Find currently selected recipe with components
  const selectedRecipeData = recipes.find(
    (r) => r.recipe.id === selectedRecipeId,
  );
  const selectedRecipe = selectedRecipeData?.recipe;
  const components = selectedRecipeData?.components || [];

  // Parse numeric values for live client preview (NOT sent as authoritative)
  const parsedTargetQty = parseInt(targetQuantity, 10);
  const parsedActualFabric = parseFloat(actualFabricUsed);
  const isValidQty = !isNaN(parsedTargetQty) && parsedTargetQty > 0;
  const isValidActualFabric = !isNaN(parsedActualFabric) && parsedActualFabric > 0;

  // Client preview calculation (UX presentation only)
  let previewExpectedFabric: number | null = null;
  let previewWastagePct: number | null = null;

  if (selectedRecipe && isValidQty) {
    previewExpectedFabric =
      Number(selectedRecipe.standard_fabric_yards) * parsedTargetQty;

    if (isValidActualFabric && previewExpectedFabric > 0) {
      previewWastagePct =
        ((parsedActualFabric - previewExpectedFabric) / previewExpectedFabric) *
        100;
    }
  }

  // Handle submit
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    // Client-side validation for immediate UX feedback
    if (!selectedRecipeId) {
      setFormError('Please select a garment recipe.');
      return;
    }

    if (!isValidQty || Number.isInteger(parsedTargetQty) === false) {
      setFormError('Target quantity must be a positive whole number.');
      return;
    }

    if (!fabricRollId.trim()) {
      setFormError('Fabric Roll ID is required.');
      return;
    }

    if (!isValidActualFabric) {
      setFormError('Actual fabric used must be a positive number.');
      return;
    }

    try {
      setSubmitting(true);

      // Send ONLY user-controlled inputs.
      // Server computes expected_fabric, wastage_pct, status, and verification items.
      const payload = {
        recipe_id: selectedRecipeId,
        target_quantity: parsedTargetQty,
        fabric_roll_id: fabricRollId.trim(),
        actual_fabric_used: parsedActualFabric,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/cutting-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string; details?: Record<string, string[]> };
        if (body.details) {
          const detailMsg = Object.values(body.details).flat().join(', ');
          throw new Error(detailMsg || body.error || 'Validation failed');
        }
        throw new Error(body.error ?? 'Failed to create cutting order.');
      }

      const body = (await res.json()) as { data: { id: string } };

      // Redirect to detail page using server-returned ID
      router.push(`/cutting-orders/${body.data.id}`);
      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'An unexpected error occurred',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingRecipes) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400 text-sm">
        <svg
          className="mx-auto h-6 w-6 animate-spin text-blue-500 mb-2"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading available recipes…
      </div>
    );
  }

  if (recipeError) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-6 text-center text-red-300 text-sm">
        <p className="font-semibold">{recipeError}</p>
        <p className="text-xs text-slate-400 mt-1">Please ensure recipes have been seeded in Supabase.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg bg-red-950/50 border border-red-800/50 px-4 py-3 text-sm text-red-300"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{formError}</span>
        </div>
      )}

      {/* Main Order Details Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-white tracking-tight border-b border-slate-800 pb-3">
          1. Recipe &amp; Production Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Recipe Select */}
          <div className="space-y-1.5 md:col-span-2">
            <label
              htmlFor="recipe-select"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
            >
              Garment Recipe <span className="text-red-400">*</span>
            </label>
            <select
              id="recipe-select"
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              disabled={submitting}
              className="
                w-full rounded-lg bg-slate-950 border border-slate-700
                px-3.5 py-2.5 text-sm font-medium text-slate-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:opacity-50 transition-all shadow-xs
              "
            >
              {recipes.map((r) => (
                <option key={r.recipe.id} value={r.recipe.id} className="bg-slate-900 text-slate-100">
                  {r.recipe.name} ({r.recipe.code}) — {r.recipe.category} [{r.recipe.standard_fabric_yards} yds/pc]
                </option>
              ))}
            </select>
          </div>

          {/* Target Quantity */}
          <div className="space-y-1.5">
            <label
              htmlFor="target-quantity"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
            >
              Target Quantity (Garment Pieces) <span className="text-red-400">*</span>
            </label>
            <input
              id="target-quantity"
              type="number"
              min="1"
              step="1"
              required
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(e.target.value)}
              disabled={submitting}
              placeholder="e.g. 100"
              className="
                w-full rounded-lg bg-slate-950 border border-slate-700
                px-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:opacity-50 transition-all shadow-xs
              "
            />
          </div>

          {/* Fabric Roll ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="fabric-roll-id"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
            >
              Fabric Roll Identifier <span className="text-red-400">*</span>
            </label>
            <input
              id="fabric-roll-id"
              type="text"
              required
              value={fabricRollId}
              onChange={(e) => setFabricRollId(e.target.value)}
              disabled={submitting}
              placeholder="e.g. ROLL-A-101"
              className="
                w-full rounded-lg bg-slate-950 border border-slate-700
                px-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:opacity-50 transition-all shadow-xs
              "
            />
          </div>

          {/* Actual Fabric Used */}
          <div className="space-y-1.5">
            <label
              htmlFor="actual-fabric-used"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
            >
              Actual Fabric Used (Yards) <span className="text-red-400">*</span>
            </label>
            <input
              id="actual-fabric-used"
              type="number"
              min="0.01"
              step="0.1"
              required
              value={actualFabricUsed}
              onChange={(e) => setActualFabricUsed(e.target.value)}
              disabled={submitting}
              placeholder="e.g. 185.0"
              className="
                w-full rounded-lg bg-slate-950 border border-slate-700
                px-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:opacity-50 transition-all shadow-xs
              "
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5 md:col-span-2">
            <label
              htmlFor="order-notes"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
            >
              Production Notes (Optional)
            </label>
            <textarea
              id="order-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Special cutting instructions or roll defect notes…"
              className="
                w-full rounded-lg bg-slate-950 border border-slate-700
                px-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:opacity-50 transition-all shadow-xs
              "
            />
          </div>
        </div>
      </div>

      {/* Selected Recipe Details & Component Preview */}
      {selectedRecipe && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white tracking-tight border-b border-slate-800 pb-3">
            2. Recipe Specification &amp; Component Preview
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Code</span>
              <span className="font-mono font-semibold text-slate-200">{selectedRecipe.code}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Category</span>
              <span className="font-semibold text-slate-200">{selectedRecipe.category}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Standard Fabric</span>
              <span className="font-semibold text-slate-200">{selectedRecipe.standard_fabric_yards} yds/pc</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Wastage Cap</span>
              <span className="font-semibold text-amber-400">+{selectedRecipe.wastage_cap_pct}% max</span>
            </div>
          </div>

          {/* Component Preview Table */}
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">Component Name</th>
                  <th className="px-3 py-2 text-right">Pieces / Garment</th>
                  <th className="px-3 py-2 text-right">Preview Expected Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {components.map((comp) => {
                  const previewQty = isValidQty ? parsedTargetQty * comp.pieces_per_garment : null;
                  return (
                    <tr key={comp.id} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-medium text-slate-200">{comp.component_name}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{comp.pieces_per_garment}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-200">
                        {previewQty !== null ? previewQty.toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Client Preview & Disclaimer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4 text-slate-300">
          <div>
            <span className="text-slate-500">Calculated Expected Fabric: </span>
            <span className="font-semibold text-white">
              {previewExpectedFabric !== null ? `${previewExpectedFabric.toFixed(1)} yds` : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Calculated Wastage %: </span>
            <span
              className={
                previewWastagePct !== null
                  ? previewWastagePct > Number(selectedRecipe?.wastage_cap_pct ?? 5)
                    ? 'font-semibold text-red-400'
                    : 'font-semibold text-emerald-400'
                  : 'text-slate-400'
              }
            >
              {previewWastagePct !== null ? `${previewWastagePct.toFixed(2)}%` : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Initial State: </span>
            <span className="font-semibold text-amber-400">CUTTING_IN_PROGRESS</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 border-t border-slate-800/60 pt-2 flex items-start gap-1.5">
          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Note: Live calculations above are for visual confirmation. Authoritative expected fabric, wastage, component quantities, and order status are calculated and enforced by the server on creation.</span>
        </p>
      </div>

      {/* Form Submission Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/cutting-orders')}
          disabled={submitting}
          className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          id="create-order-submit"
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
        >
          {submitting ? (
            <>
              <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating Order…
            </>
          ) : (
            'Create Cutting Order'
          )}
        </button>
      </div>
    </form>
  );
}
