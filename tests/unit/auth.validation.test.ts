/**
 * Unit tests: Auth validation schemas
 *
 * Tests:
 *   - Login schema accepts valid input
 *   - Login schema rejects invalid email
 *   - Login schema rejects empty password
 *   - componentCountSchema rejects negatives, decimals, non-numbers
 *   - rejectVerificationSchema requires non-empty reason
 *   - approveVerificationSchema rejects extra fields (strict)
 */
import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/src/validation/authSchemas';
import {
  componentCountSchema,
  rejectVerificationSchema,
  approveVerificationSchema,
} from '@/src/validation/verificationSchemas';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'supervisor@apparelflow.dev',
      password: 'Demo1234!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'Demo1234!' });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'Demo1234!' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('normalises email to lowercase', () => {
    const result = loginSchema.safeParse({
      email: 'SUPERVISOR@APPARELFLOW.DEV',
      password: 'Demo1234!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('supervisor@apparelflow.dev');
    }
  });
});

describe('componentCountSchema', () => {
  it('accepts a valid whole-number count', () => {
    const result = componentCountSchema.safeParse({ actual_quantity: 50 });
    expect(result.success).toBe(true);
  });

  it('accepts zero (uncounted component reset)', () => {
    const result = componentCountSchema.safeParse({ actual_quantity: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative numbers', () => {
    const result = componentCountSchema.safeParse({ actual_quantity: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects decimal numbers', () => {
    const result = componentCountSchema.safeParse({ actual_quantity: 50.5 });
    expect(result.success).toBe(false);
  });

  it('rejects string input', () => {
    const result = componentCountSchema.safeParse({ actual_quantity: 'fifty' });
    expect(result.success).toBe(false);
  });

  it('rejects missing actual_quantity', () => {
    const result = componentCountSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects client-supplied expected_quantity (no such field in schema)', () => {
    // The schema should only accept actual_quantity.
    // expected_quantity from client is ignored (not a field in the schema).
    const result = componentCountSchema.safeParse({
      actual_quantity: 50,
      expected_quantity: 100, // client trying to override server value
    });
    // Zod by default strips unknown fields — parse succeeds but strips the extra field
    if (result.success) {
      expect((result.data as Record<string, unknown>)['expected_quantity']).toBeUndefined();
    }
  });
});

describe('rejectVerificationSchema', () => {
  it('accepts a valid reason', () => {
    const result = rejectVerificationSchema.safeParse({ reason: 'Component shortage in Sleeve Cuffs' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty reason string', () => {
    const result = rejectVerificationSchema.safeParse({ reason: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a whitespace-only reason', () => {
    const result = rejectVerificationSchema.safeParse({ reason: '   ' });
    // After trim(), whitespace-only becomes empty string → fails min(1)
    expect(result.success).toBe(false);
  });

  it('rejects missing reason', () => {
    const result = rejectVerificationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects reason exceeding 1000 chars', () => {
    const result = rejectVerificationSchema.safeParse({ reason: 'x'.repeat(1001) });
    expect(result.success).toBe(false);
  });
});

describe('approveVerificationSchema (strict empty body)', () => {
  it('accepts an empty body', () => {
    const result = approveVerificationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects a body with verifier_id (client cannot supply this)', () => {
    const result = approveVerificationSchema.safeParse({
      verifier_id: 'some-uuid', // attacker trying to forge identity
    });
    expect(result.success).toBe(false);
  });

  it('rejects a body with status (client cannot set status)', () => {
    const result = approveVerificationSchema.safeParse({
      status: 'VERIFIED', // attacker trying to skip gatekeeper
    });
    expect(result.success).toBe(false);
  });
});
