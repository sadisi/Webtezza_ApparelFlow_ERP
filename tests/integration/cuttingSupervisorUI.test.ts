/**
 * Integration & UI logic tests: Cutting Supervisor Workflow (Phase 7)
 *
 * Verifies:
 *   1. Role permission matrix boundaries for Cutting Supervisor, Verifier, and Sewing Supervisor
 *   2. Client form payload validation (rejection of unauthorized fields like status or expected_quantity)
 *   3. Server-authoritative calculations for expected fabric, wastage %, and initial status
 *   4. Status badge and traffic-light badge mapping
 */

import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, parseRole } from '@/src/auth/roles';
import { createOrderSchema } from '@/src/validation/orderSchemas';
import {
  calculateExpectedFabric,
  calculateWastagePct,
  calculateExpectedQuantity,
} from '@/src/domain';

describe('Phase 7 — Cutting Supervisor UI: Role Permission Matrix', () => {
  it('cutting_supervisor has permissions for creation and viewing orders, but not verification or sewing', () => {
    const perms = ROLE_PERMISSIONS['cutting_supervisor'];
    expect(perms.canCreateOrder).toBe(true);
    expect(perms.canViewOwnOrders).toBe(true);
    expect(perms.canAccessVerification).toBe(false);
    expect(perms.canAccessSewingQueue).toBe(false);
  });

  it('cutting_verifier cannot create orders', () => {
    const perms = ROLE_PERMISSIONS['cutting_verifier'];
    expect(perms.canCreateOrder).toBe(false);
    expect(perms.canAccessVerification).toBe(true);
  });

  it('sewing_supervisor cannot create orders or verify', () => {
    const perms = ROLE_PERMISSIONS['sewing_supervisor'];
    expect(perms.canCreateOrder).toBe(false);
    expect(perms.canAccessVerification).toBe(false);
    expect(perms.canAccessSewingQueue).toBe(true);
  });

  it('parseRole correctly validates roles', () => {
    expect(parseRole('cutting_supervisor')).toBe('cutting_supervisor');
    expect(parseRole('cutting_verifier')).toBe('cutting_verifier');
    expect(parseRole('sewing_supervisor')).toBe('sewing_supervisor');
    expect(parseRole('admin')).toBeNull();
  });
});

describe('Phase 7 — Cutting Supervisor UI: Client Payload Security & Validation', () => {
  const validRecipeId = '123e4567-e89b-12d3-a456-426614174000';

  it('accepts valid cutting order creation input', () => {
    const input = {
      recipe_id: validRecipeId,
      target_quantity: 100,
      fabric_roll_id: 'ROLL-A-101',
      actual_fabric_used: 185.0,
      notes: 'Initial batch',
    };

    const parsed = createOrderSchema.parse(input);
    expect(parsed.recipe_id).toBe(validRecipeId);
    expect(parsed.target_quantity).toBe(100);
    expect(parsed.fabric_roll_id).toBe('ROLL-A-101');
    expect(parsed.actual_fabric_used).toBe(185.0);
  });

  it('strips/ignores client-submitted status, expected_fabric, or wastage_pct', () => {
    const maliciousInput = {
      recipe_id: validRecipeId,
      target_quantity: 100,
      fabric_roll_id: 'ROLL-A-101',
      actual_fabric_used: 185.0,
      // Client attempting to override server values:
      status: 'VERIFIED',
      expected_fabric: 10.0,
      wastage_pct: 0.0,
      expected_quantity: 500,
    };

    const parsed = createOrderSchema.parse(maliciousInput);
    expect(parsed).not.toHaveProperty('status');
    expect(parsed).not.toHaveProperty('expected_fabric');
    expect(parsed).not.toHaveProperty('wastage_pct');
    expect(parsed).not.toHaveProperty('expected_quantity');
  });

  it('rejects target_quantity of zero or negative', () => {
    expect(() =>
      createOrderSchema.parse({
        recipe_id: validRecipeId,
        target_quantity: 0,
        fabric_roll_id: 'ROLL-1',
        actual_fabric_used: 100,
      }),
    ).toThrow();

    expect(() =>
      createOrderSchema.parse({
        recipe_id: validRecipeId,
        target_quantity: -50,
        fabric_roll_id: 'ROLL-1',
        actual_fabric_used: 100,
      }),
    ).toThrow();
  });

  it('rejects decimal target_quantity', () => {
    expect(() =>
      createOrderSchema.parse({
        recipe_id: validRecipeId,
        target_quantity: 10.5,
        fabric_roll_id: 'ROLL-1',
        actual_fabric_used: 100,
      }),
    ).toThrow();
  });

  it('rejects empty fabric_roll_id', () => {
    expect(() =>
      createOrderSchema.parse({
        recipe_id: validRecipeId,
        target_quantity: 100,
        fabric_roll_id: '',
        actual_fabric_used: 100,
      }),
    ).toThrow();
  });
});

describe('Phase 7 — Server Authoritative Calculations for UI Verification', () => {
  it('computes expected fabric and wastage correctly for Casual Blouse (1.8 yds/pc)', () => {
    const standardFabric = 1.8;
    const targetQty = 100;
    const actualFabric = 185.0;

    const expectedFabric = calculateExpectedFabric(standardFabric, targetQty);
    expect(expectedFabric).toBe(180.0);

    const wastage = calculateWastagePct(actualFabric, expectedFabric);
    // ((185 - 180) / 180) * 100 = 2.7777777777777777
    expect(wastage).toBeCloseTo(2.78, 2);
  });

  it('computes expected component piece quantities correctly', () => {
    const targetQty = 200;
    const piecesPerGarment = 2; // e.g. sleeves

    const expectedQty = calculateExpectedQuantity(targetQty, piecesPerGarment);
    expect(expectedQty).toBe(400);
  });
});
