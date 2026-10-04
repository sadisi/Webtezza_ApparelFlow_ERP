/**
 * Unit Tests: Domain Component Quantity Calculation
 *
 * Validates target batch quantity * pieces per garment multiplication and input validation.
 */

import { describe, it, expect } from 'vitest';
import { calculateExpectedQuantity, InvalidQuantityError } from '@/src/domain';

describe('Domain Component Quantity Calculation', () => {
  it('correctly multiplies target quantity by pieces per garment', () => {
    expect(calculateExpectedQuantity(100, 2)).toBe(200);
    expect(calculateExpectedQuantity(50, 4)).toBe(200);
    expect(calculateExpectedQuantity(1, 1)).toBe(1);
    expect(calculateExpectedQuantity(500, 3)).toBe(1500);
  });

  it('rejects zero target quantity', () => {
    expect(() => calculateExpectedQuantity(0, 2)).toThrow(InvalidQuantityError);
  });

  it('rejects negative target quantity', () => {
    expect(() => calculateExpectedQuantity(-10, 2)).toThrow(InvalidQuantityError);
  });

  it('rejects decimal target quantity', () => {
    expect(() => calculateExpectedQuantity(10.5, 2)).toThrow(InvalidQuantityError);
  });

  it('rejects NaN, Infinity, null, or string as target quantity', () => {
    expect(() => calculateExpectedQuantity(NaN, 2)).toThrow(InvalidQuantityError);
    expect(() => calculateExpectedQuantity(Infinity, 2)).toThrow(InvalidQuantityError);
    expect(() => calculateExpectedQuantity(null as unknown as number, 2)).toThrow(
      InvalidQuantityError,
    );
    expect(() => calculateExpectedQuantity('100' as unknown as number, 2)).toThrow(
      InvalidQuantityError,
    );
  });

  it('rejects zero pieces per garment', () => {
    expect(() => calculateExpectedQuantity(100, 0)).toThrow(InvalidQuantityError);
  });

  it('rejects negative pieces per garment', () => {
    expect(() => calculateExpectedQuantity(100, -1)).toThrow(InvalidQuantityError);
  });

  it('rejects decimal pieces per garment', () => {
    expect(() => calculateExpectedQuantity(100, 1.5)).toThrow(InvalidQuantityError);
  });
});
