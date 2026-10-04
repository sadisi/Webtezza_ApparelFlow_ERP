/**
 * Unit Tests: Domain Wastage Calculations
 *
 * Validates fabric expected yards, wastage percentage formulas, precision rounding,
 * and wastage cap checking.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateExpectedFabric,
  calculateWastagePct,
  isWastageExceeded,
  InvalidQuantityError,
} from '@/src/domain';

describe('Domain Fabric Wastage Calculations', () => {
  describe('calculateExpectedFabric', () => {
    it('calculates expected fabric correctly (standard_yards * target_qty)', () => {
      // Example from prompt: 1.8 yards * 100 garments = 180 yards
      expect(calculateExpectedFabric(1.8, 100)).toBe(180);
      expect(calculateExpectedFabric(2.25, 200)).toBe(450);
      expect(calculateExpectedFabric(1.2, 50)).toBe(60);
    });

    it('rounds expected fabric to 2 decimal places', () => {
      expect(calculateExpectedFabric(1.333, 100)).toBe(133.3);
    });

    it('rejects zero or negative standard fabric yards', () => {
      expect(() => calculateExpectedFabric(0, 100)).toThrow(InvalidQuantityError);
      expect(() => calculateExpectedFabric(-1.5, 100)).toThrow(InvalidQuantityError);
    });

    it('rejects zero, negative, or decimal target quantity', () => {
      expect(() => calculateExpectedFabric(1.8, 0)).toThrow(InvalidQuantityError);
      expect(() => calculateExpectedFabric(1.8, -10)).toThrow(InvalidQuantityError);
      expect(() => calculateExpectedFabric(1.8, 50.5)).toThrow(InvalidQuantityError);
    });
  });

  describe('calculateWastagePct', () => {
    it('calculates 0% wastage when actual fabric equals expected fabric', () => {
      expect(calculateWastagePct(180, 180)).toBe(0);
    });

    it('calculates positive wastage percentage when actual fabric exceeds expected (exact prompt example)', () => {
      // Prompt example: expected = 180 yards, actual = 189 yards
      // ((189 - 180) / 180) * 100 = (9 / 180) * 100 = 5%
      expect(calculateWastagePct(189, 180)).toBe(5);
    });

    it('calculates negative percentage when actual fabric used is less than expected (savings)', () => {
      // actual = 171 yards, expected = 180 yards
      // ((171 - 180) / 180) * 100 = (-9 / 180) * 100 = -5%
      expect(calculateWastagePct(171, 180)).toBe(-5);
    });

    it('rounds wastage percentage to 2 decimal places', () => {
      // actual = 185, expected = 180 -> ((185-180)/180)*100 = (5/180)*100 = 2.7777...% -> 2.78%
      expect(calculateWastagePct(185, 180)).toBe(2.78);
    });

    it('rejects zero or negative expected fabric', () => {
      expect(() => calculateWastagePct(100, 0)).toThrow(InvalidQuantityError);
      expect(() => calculateWastagePct(100, -50)).toThrow(InvalidQuantityError);
    });

    it('rejects negative actual fabric used', () => {
      expect(() => calculateWastagePct(-10, 180)).toThrow(InvalidQuantityError);
    });
  });

  describe('isWastageExceeded', () => {
    it('returns true when wastage percentage exceeds recipe cap', () => {
      expect(isWastageExceeded(5.5, 5.0)).toBe(true);
    });

    it('returns false when wastage percentage is within or equal to recipe cap', () => {
      expect(isWastageExceeded(5.0, 5.0)).toBe(false);
      expect(isWastageExceeded(3.2, 5.0)).toBe(false);
      expect(isWastageExceeded(-2.0, 5.0)).toBe(false);
    });
  });
});
