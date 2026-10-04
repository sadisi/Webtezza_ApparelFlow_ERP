/**
 * Unit Tests: Domain Verification Gate Evaluation
 *
 * Validates production gate rules:
 *   1. All GREEN -> approval allowed
 *   2. GREEN + YELLOW -> approval allowed (surplus does NOT block)
 *   3. Any RED -> approval BLOCKED (shortage gate stop)
 *   4. One or more uncounted components -> approval BLOCKED
 *   5. Empty component list -> approval BLOCKED
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateVerificationGate,
  canApproveVerification,
  assertCanApproveVerification,
  VerificationGateError,
  VerificationItemInput,
} from '@/src/domain';

describe('Domain Verification Gate Evaluation', () => {
  it('allows approval when all components are GREEN', () => {
    const items: VerificationItemInput[] = [
      { component_name: 'Front Panel', expected_quantity: 200, actual_quantity: 200 },
      { component_name: 'Back Panel', expected_quantity: 200, actual_quantity: 200 },
      { component_name: 'Sleeves', expected_quantity: 400, actual_quantity: 400 },
    ];

    const result = evaluateVerificationGate(items);
    expect(result.canApprove).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.greenCount).toBe(3);
    expect(result.yellowCount).toBe(0);
    expect(result.redCount).toBe(0);
    expect(result.uncountedCount).toBe(0);
    expect(canApproveVerification(items)).toBe(true);
    expect(() => assertCanApproveVerification(items)).not.toThrow();
  });

  it('allows approval when components are GREEN and YELLOW (surplus allowed)', () => {
    const items: VerificationItemInput[] = [
      { component_name: 'Front Panel', expected_quantity: 200, actual_quantity: 200 }, // GREEN
      { component_name: 'Collar', expected_quantity: 100, actual_quantity: 105 },       // YELLOW surplus
    ];

    const result = evaluateVerificationGate(items);
    expect(result.canApprove).toBe(true);
    expect(result.greenCount).toBe(1);
    expect(result.yellowCount).toBe(1);
    expect(result.redCount).toBe(0);
    expect(canApproveVerification(items)).toBe(true);
    expect(() => assertCanApproveVerification(items)).not.toThrow();
  });

  it('blocks approval when any component is RED (shortage)', () => {
    const items: VerificationItemInput[] = [
      { component_name: 'Front Panel', expected_quantity: 200, actual_quantity: 200 },
      { component_name: 'Back Panel', expected_quantity: 200, actual_quantity: 195 }, // RED (-5 pcs)
    ];

    const result = evaluateVerificationGate(items);
    expect(result.canApprove).toBe(false);
    expect(result.redCount).toBe(1);
    expect(result.reasons[0]).toContain("Component 'Back Panel' has a RED shortage");
    expect(canApproveVerification(items)).toBe(false);
    expect(() => assertCanApproveVerification(items)).toThrow(VerificationGateError);
  });

  it('blocks approval when one component is uncounted (actual is null or undefined)', () => {
    const items: VerificationItemInput[] = [
      { component_name: 'Front Panel', expected_quantity: 200, actual_quantity: 200 },
      { component_name: 'Sleeves', expected_quantity: 400, actual_quantity: null }, // Uncounted
    ];

    const result = evaluateVerificationGate(items);
    expect(result.canApprove).toBe(false);
    expect(result.uncountedCount).toBe(1);
    expect(result.reasons[0]).toContain("Component 'Sleeves' has not been counted yet.");
    expect(canApproveVerification(items)).toBe(false);
    expect(() => assertCanApproveVerification(items)).toThrow(VerificationGateError);
  });

  it('blocks approval when multiple components are RED', () => {
    const items: VerificationItemInput[] = [
      { component_name: 'Front Panel', expected_quantity: 200, actual_quantity: 190 }, // RED
      { component_name: 'Back Panel', expected_quantity: 200, actual_quantity: 180 },  // RED
    ];

    const result = evaluateVerificationGate(items);
    expect(result.canApprove).toBe(false);
    expect(result.redCount).toBe(2);
    expect(result.reasons).toHaveLength(2);
    expect(() => assertCanApproveVerification(items)).toThrow(VerificationGateError);
  });

  it('blocks approval for empty component list', () => {
    const items: VerificationItemInput[] = [];

    const result = evaluateVerificationGate(items);
    expect(result.canApprove).toBe(false);
    expect(result.totalComponents).toBe(0);
    expect(result.reasons[0]).toContain('no component items');
    expect(canApproveVerification(items)).toBe(false);
    expect(() => assertCanApproveVerification(items)).toThrow(VerificationGateError);
  });
});
