/**
 * Unit Tests: Traffic Light Calculation Rules
 *
 * Validates GREEN (exact match), YELLOW (surplus), RED (shortage), and uncounted states.
 */

import { describe, it, expect } from 'vitest';
import { computeTrafficLight, computeVariance } from '@/src/domain';

describe('Domain Traffic Light Calculation', () => {
  describe('computeTrafficLight', () => {
    it('returns GREEN when actual count equals expected count (exact match)', () => {
      expect(computeTrafficLight(200, 200)).toBe('GREEN');
      expect(computeTrafficLight(1, 1)).toBe('GREEN');
    });

    it('returns YELLOW when actual count is greater than expected count (surplus)', () => {
      expect(computeTrafficLight(200, 205)).toBe('YELLOW');
      expect(computeTrafficLight(100, 101)).toBe('YELLOW');
    });

    it('returns RED when actual count is less than expected count (shortage)', () => {
      expect(computeTrafficLight(200, 199)).toBe('RED');
      expect(computeTrafficLight(100, 0)).toBe('RED');
    });

    it('returns null when actual count is null or undefined (uncounted)', () => {
      expect(computeTrafficLight(200, null)).toBeNull();
      expect(computeTrafficLight(200, undefined)).toBeNull();
    });

    it('handles zero/invalid expected quantity safely (returns null)', () => {
      expect(computeTrafficLight(0, 100)).toBeNull();
      expect(computeTrafficLight(-50, 100)).toBeNull();
      expect(computeTrafficLight(NaN, 100)).toBeNull();
    });

    it('handles invalid actual quantity safely (negative / decimal / NaN)', () => {
      expect(computeTrafficLight(100, -5)).toBeNull();
      expect(computeTrafficLight(100, 99.5)).toBeNull();
      expect(computeTrafficLight(100, NaN)).toBeNull();
    });
  });

  describe('computeVariance', () => {
    it('calculates zero variance for exact match', () => {
      expect(computeVariance(200, 200)).toBe(0);
    });

    it('calculates positive variance for surplus', () => {
      expect(computeVariance(200, 210)).toBe(10);
    });

    it('calculates negative variance for shortage', () => {
      expect(computeVariance(200, 190)).toBe(-10);
    });

    it('returns null when actual is null or undefined', () => {
      expect(computeVariance(200, null)).toBeNull();
      expect(computeVariance(200, undefined)).toBeNull();
    });
  });
});
