/**
 * Domain: Traffic Light Rules & Verification Gate
 *
 * Enforces the traffic-light assessment rules and the production gate
 * that prevents incomplete, shortage, or unverified batches from entering
 * the sewing queue.
 *
 * Rules:
 *   GREEN  — actual === expected (Exact match)
 *   YELLOW — actual > expected   (Surplus — allowed, does NOT block approval)
 *   RED    — actual < expected   (Shortage — STOPS approval, blocks queue entry)
 *   UNCOUNTED — actual is null/undefined (STOPS approval)
 */

import { TrafficLight } from '@/src/types';
import { VerificationGateError } from './errors';

export interface VerificationItemInput {
  id?: string;
  component_name?: string;
  expected_quantity: number;
  actual_quantity: number | null | undefined;
}

export interface VerificationGateResult {
  canApprove: boolean;
  reasons: string[];
  totalComponents: number;
  countedComponents: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  uncountedCount: number;
}

/**
 * Computes the traffic light status for a verification item.
 *
 * @param expected Expected piece count (must be > 0)
 * @param actual Actual count entered by verifier (null/undefined if not yet counted)
 * @returns 'GREEN', 'YELLOW', 'RED', or null if uncounted/invalid
 */
export function computeTrafficLight(
  expected: number,
  actual: number | null | undefined,
): TrafficLight | null {
  if (
    typeof expected !== 'number' ||
    !Number.isFinite(expected) ||
    expected <= 0
  ) {
    return null;
  }

  if (actual === null || actual === undefined) {
    return null; // Uncounted
  }

  if (
    typeof actual !== 'number' ||
    !Number.isFinite(actual) ||
    !Number.isInteger(actual) ||
    actual < 0
  ) {
    return null;
  }

  if (actual === expected) {
    return 'GREEN';
  }

  if (actual > expected) {
    return 'YELLOW';
  }

  return 'RED';
}

/**
 * Computes the count variance (actual - expected).
 *
 * @returns Variance integer (positive = surplus, negative = shortage), or null if uncounted.
 */
export function computeVariance(
  expected: number,
  actual: number | null | undefined,
): number | null {
  if (
    typeof expected !== 'number' ||
    !Number.isFinite(expected) ||
    actual === null ||
    actual === undefined ||
    typeof actual !== 'number' ||
    !Number.isFinite(actual)
  ) {
    return null;
  }

  return actual - expected;
}

/**
 * Evaluates the production verification gate for a list of verification items.
 *
 * Gate Rules for Approval:
 *   1. Component list must not be empty.
 *   2. EVERY component must be counted (actual_quantity !== null).
 *   3. NO component may have a RED traffic light (shortage).
 *   4. YELLOW components (surplus) ARE ALLOWED.
 *
 * @param items List of component verification items
 * @returns Detailed verification gate decision
 */
export function evaluateVerificationGate(
  items: VerificationItemInput[],
): VerificationGateResult {
  const reasons: string[] = [];
  let countedComponents = 0;
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  let uncountedCount = 0;

  if (!items || items.length === 0) {
    reasons.push('Verification batch has no component items.');
    return {
      canApprove: false,
      reasons,
      totalComponents: 0,
      countedComponents: 0,
      greenCount: 0,
      yellowCount: 0,
      redCount: 0,
      uncountedCount: 0,
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const name = item.component_name ?? `Component #${i + 1}`;
    const light = computeTrafficLight(item.expected_quantity, item.actual_quantity);

    if (item.actual_quantity === null || item.actual_quantity === undefined) {
      uncountedCount++;
      reasons.push(`Component '${name}' has not been counted yet.`);
    } else if (light === 'RED') {
      redCount++;
      countedComponents++;
      const shortage = item.expected_quantity - item.actual_quantity;
      reasons.push(
        `Component '${name}' has a RED shortage: expected ${item.expected_quantity}, actual ${item.actual_quantity} (shortage: ${shortage} pcs).`,
      );
    } else if (light === 'GREEN') {
      greenCount++;
      countedComponents++;
    } else if (light === 'YELLOW') {
      yellowCount++;
      countedComponents++;
    } else {
      // Invalid quantity
      uncountedCount++;
      reasons.push(`Component '${name}' has invalid count value.`);
    }
  }

  const canApprove = reasons.length === 0;

  return {
    canApprove,
    reasons,
    totalComponents: items.length,
    countedComponents,
    greenCount,
    yellowCount,
    redCount,
    uncountedCount,
  };
}

/**
 * Convenience helper returning true if the verification items meet approval criteria.
 */
export function canApproveVerification(items: VerificationItemInput[]): boolean {
  return evaluateVerificationGate(items).canApprove;
}

/**
 * Asserts that a verification batch can be approved.
 * Throws `VerificationGateError` with detailed reasons if approval is blocked.
 */
export function assertCanApproveVerification(
  items: VerificationItemInput[],
): void {
  const result = evaluateVerificationGate(items);
  if (!result.canApprove) {
    throw new VerificationGateError(result.reasons);
  }
}
