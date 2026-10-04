/**
 * Unit tests: Auth roles module
 *
 * Tests:
 *   1. parseRole rejects invalid role values
 *   2. parseRole accepts all valid roles
 *   3. AuthError carries correct status codes
 *   4. ROLE_PERMISSIONS matrix is correct for each role
 */
import { describe, it, expect } from 'vitest';
import {
  parseRole,
  AuthError,
  USER_ROLES,
  ROLE_PERMISSIONS,
} from '@/src/auth/roles';

describe('parseRole()', () => {
  it('returns null for an empty string', () => {
    expect(parseRole('')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseRole(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseRole(undefined)).toBeNull();
  });

  it('returns null for a number', () => {
    expect(parseRole(42)).toBeNull();
  });

  it('returns null for an invalid role string', () => {
    expect(parseRole('admin')).toBeNull();
    expect(parseRole('CUTTING_SUPERVISOR')).toBeNull(); // case-sensitive
    expect(parseRole('superuser')).toBeNull();
    expect(parseRole('verified')).toBeNull();
  });

  it('accepts cutting_supervisor', () => {
    expect(parseRole('cutting_supervisor')).toBe('cutting_supervisor');
  });

  it('accepts cutting_verifier', () => {
    expect(parseRole('cutting_verifier')).toBe('cutting_verifier');
  });

  it('accepts sewing_supervisor', () => {
    expect(parseRole('sewing_supervisor')).toBe('sewing_supervisor');
  });

  it('accepts all USER_ROLES values', () => {
    for (const role of USER_ROLES) {
      expect(parseRole(role)).toBe(role);
    }
  });
});

describe('AuthError', () => {
  it('creates a 401 error', () => {
    const err = new AuthError(401, 'Not authenticated');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Not authenticated');
    expect(err.name).toBe('AuthError');
    expect(err).toBeInstanceOf(AuthError);
    expect(err).toBeInstanceOf(Error);
  });

  it('creates a 403 error', () => {
    const err = new AuthError(403, 'Forbidden');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
  });

  it('is distinguishable from generic Error', () => {
    const authErr = new AuthError(403, 'Forbidden');
    const genericErr = new Error('Forbidden');
    expect(authErr instanceof AuthError).toBe(true);
    expect(genericErr instanceof AuthError).toBe(false);
  });
});

describe('ROLE_PERMISSIONS matrix', () => {
  it('cutting_supervisor cannot approve verification', () => {
    expect(ROLE_PERMISSIONS.cutting_supervisor.canApproveVerification).toBe(false);
  });

  it('cutting_supervisor can create orders', () => {
    expect(ROLE_PERMISSIONS.cutting_supervisor.canCreateOrder).toBe(true);
  });

  it('cutting_supervisor cannot access sewing queue', () => {
    expect(ROLE_PERMISSIONS.cutting_supervisor.canAccessSewingQueue).toBe(false);
  });

  it('cutting_verifier can approve verification', () => {
    expect(ROLE_PERMISSIONS.cutting_verifier.canApproveVerification).toBe(true);
  });

  it('cutting_verifier cannot create orders', () => {
    expect(ROLE_PERMISSIONS.cutting_verifier.canCreateOrder).toBe(false);
  });

  it('cutting_verifier cannot access sewing queue', () => {
    expect(ROLE_PERMISSIONS.cutting_verifier.canAccessSewingQueue).toBe(false);
  });

  it('sewing_supervisor can access sewing queue', () => {
    expect(ROLE_PERMISSIONS.sewing_supervisor.canAccessSewingQueue).toBe(true);
  });

  it('sewing_supervisor cannot approve verification', () => {
    expect(ROLE_PERMISSIONS.sewing_supervisor.canApproveVerification).toBe(false);
  });

  it('sewing_supervisor cannot create orders', () => {
    expect(ROLE_PERMISSIONS.sewing_supervisor.canCreateOrder).toBe(false);
  });
});
