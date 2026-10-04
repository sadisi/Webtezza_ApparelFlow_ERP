/**
 * Integration tests: Input validation edge cases
 *
 * Tests covering Part I and the architecture requirements:
 *   - Negative quantities rejected
 *   - Decimal quantities rejected  
 *   - Non-numeric values rejected
 *   - Empty required fields rejected
 *   - Invalid UUID rejected
 *   - Excessive quantities rejected
 */
import { describe, it, expect } from 'vitest';
import { createOrderSchema } from '@/src/validation/orderSchemas';
import { componentCountSchema } from '@/src/validation/verificationSchemas';

describe('createOrderSchema: validation edge cases', () => {
  const validBase = {
    recipe_id: 'a1b2c3d4-0001-0001-0001-000000000001',
    target_quantity: 50,
    fabric_roll_id: 'ROLL-001',
    actual_fabric_used: 92.5,
  };

  it('accepts a fully valid order', () => {
    expect(createOrderSchema.safeParse(validBase).success).toBe(true);
  });

  it('rejects negative target_quantity', () => {
    expect(
      createOrderSchema.safeParse({ ...validBase, target_quantity: -10 }).success,
    ).toBe(false);
  });

  it('rejects zero target_quantity', () => {
    expect(
      createOrderSchema.safeParse({ ...validBase, target_quantity: 0 }).success,
    ).toBe(false);
  });

  it('rejects decimal target_quantity', () => {
    expect(
      createOrderSchema.safeParse({ ...validBase, target_quantity: 50.5 }).success,
    ).toBe(false);
  });

  it('rejects string target_quantity', () => {
    expect(
      createOrderSchema.safeParse({ ...validBase, target_quantity: 'fifty' }).success,
    ).toBe(false);
  });

  it('rejects excessive target_quantity', () => {
    expect(
      createOrderSchema.safeParse({ ...validBase, target_quantity: 200_000 }).success,
    ).toBe(false);
  });

  it('rejects negative actual_fabric_used', () => {
    expect(
      createOrderSchema.safeParse({ ...validBase, actual_fabric_used: -1 }).success,
    ).toBe(false);
  });

  it('rejects zero actual_fabric_used', () => {
    expect(
      createOrderSchema.safeParse({ ...validBase, actual_fabric_used: 0 }).success,
    ).toBe(false);
  });

  it('rejects empty fabric_roll_id', () => {
    expect(
      createOrderSchema.safeParse({ ...validBase, fabric_roll_id: '' }).success,
    ).toBe(false);
  });

  it('rejects invalid recipe_id (not a UUID)', () => {
    expect(
      createOrderSchema.safeParse({ ...validBase, recipe_id: 'not-a-uuid' }).success,
    ).toBe(false);
  });

  it('rejects missing recipe_id', () => {
    const withoutRecipe = { ...validBase, recipe_id: undefined };
    expect(createOrderSchema.safeParse(withoutRecipe).success).toBe(false);
  });

  it('rejects client-supplied expected_quantity (not in schema)', () => {
    // expected_quantity is NOT a field in the schema.
    // It should be stripped or cause no trust.
    const result = createOrderSchema.safeParse({
      ...validBase,
      expected_quantity: 1000, // attacker trying to override server calc
    });
    // Zod strips unknown fields — parse succeeds but field is gone
    if (result.success) {
      expect((result.data as Record<string, unknown>)['expected_quantity']).toBeUndefined();
    }
  });
});

describe('componentCountSchema: validation edge cases', () => {
  it('accepts 0 (valid: verifier resets a component)', () => {
    expect(componentCountSchema.safeParse({ actual_quantity: 0 }).success).toBe(true);
  });

  it('accepts large valid count', () => {
    expect(componentCountSchema.safeParse({ actual_quantity: 500 }).success).toBe(true);
  });

  it('rejects -1', () => {
    expect(componentCountSchema.safeParse({ actual_quantity: -1 }).success).toBe(false);
  });

  it('rejects -100', () => {
    expect(componentCountSchema.safeParse({ actual_quantity: -100 }).success).toBe(false);
  });

  it('rejects 0.5 (decimal)', () => {
    expect(componentCountSchema.safeParse({ actual_quantity: 0.5 }).success).toBe(false);
  });

  it('rejects 99.99 (decimal)', () => {
    expect(componentCountSchema.safeParse({ actual_quantity: 99.99 }).success).toBe(false);
  });

  it('rejects "100" (string)', () => {
    expect(componentCountSchema.safeParse({ actual_quantity: '100' }).success).toBe(false);
  });

  it('rejects null', () => {
    expect(componentCountSchema.safeParse({ actual_quantity: null }).success).toBe(false);
  });

  it('rejects missing field', () => {
    expect(componentCountSchema.safeParse({}).success).toBe(false);
  });

  it('does not accept traffic_light from client', () => {
    // traffic_light is not in the schema — attacker cannot override it
    const result = componentCountSchema.safeParse({
      actual_quantity: 50,
      traffic_light: 'GREEN',
    });
    if (result.success) {
      expect((result.data as Record<string, unknown>)['traffic_light']).toBeUndefined();
    }
  });
});
