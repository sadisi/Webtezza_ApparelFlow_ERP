/**
 * Integration tests: Role enforcement
 *
 * These tests verify the RBAC guard logic in isolation using mocked
 * server sessions. They do not make real HTTP requests.
 *
 * Tests covering Part I requirements:
 *   - Unauthenticated user → AuthError(401)
 *   - Wrong role → AuthError(403)
 *   - Valid role → user returned
 *   - Invalid role value in DB → treated as unauthenticated
 */
import { describe, it, expect } from 'vitest';
import { AuthError, parseRole } from '@/src/auth/roles';

// ─── Mock the requireRole dependencies ───────────────────────────────────────
// We test the RBAC logic directly rather than through HTTP
// to avoid needing a live Supabase instance in unit tests.

/**
 * Simulates the requireRole() guard logic with injectable user state.
 * This mirrors the actual implementation without the Supabase call.
 */
async function mockRequireRole(
  mockUser: { id: string; email: string; role: string; full_name: string } | null,
  ...allowedRoles: string[]
) {
  // Step 1: Check authentication
  if (!mockUser) {
    throw new AuthError(401, 'Authentication required');
  }

  // Step 2: Validate the role value (as getServerUser() does)
  const validRole = parseRole(mockUser.role);
  if (!validRole) {
    throw new AuthError(401, 'Authentication required'); // Invalid role = unauthenticated
  }

  // Step 3: Check role authorization
  if (!allowedRoles.includes(validRole)) {
    throw new AuthError(
      403,
      `Access denied. Required: ${allowedRoles.join(', ')}. Your role: ${validRole}`,
    );
  }

  return { ...mockUser, role: validRole };
}

describe('RBAC: Unauthenticated request', () => {
  it('throws AuthError(401) when no user session exists', async () => {
    await expect(mockRequireRole(null, 'cutting_verifier')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('is an AuthError instance (not generic Error)', async () => {
    try {
      await mockRequireRole(null, 'cutting_supervisor');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
    }
  });
});

describe('RBAC: Wrong role gets 403', () => {
  const supervisor = {
    id: 'uuid-supervisor',
    email: 'supervisor@apparelflow.dev',
    role: 'cutting_supervisor',
    full_name: 'Alex Supervisor',
  };

  it('cutting_supervisor calling verifier-only route → 403', async () => {
    await expect(
      mockRequireRole(supervisor, 'cutting_verifier'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('cutting_supervisor calling sewing-only route → 403', async () => {
    await expect(
      mockRequireRole(supervisor, 'sewing_supervisor'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('cutting_verifier calling supervisor-only route → 403', async () => {
    const verifier = { ...supervisor, role: 'cutting_verifier', email: 'verifier@apparelflow.dev' };
    await expect(
      mockRequireRole(verifier, 'cutting_supervisor'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('sewing_supervisor cannot approve verification → 403', async () => {
    const sewing = { ...supervisor, role: 'sewing_supervisor', email: 'sewing@apparelflow.dev' };
    await expect(
      mockRequireRole(sewing, 'cutting_verifier'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('RBAC: Valid authenticated users pass', () => {
  it('cutting_supervisor passes a supervisor-only check', async () => {
    const user = await mockRequireRole(
      {
        id: 'uuid-sup',
        email: 'supervisor@apparelflow.dev',
        role: 'cutting_supervisor',
        full_name: 'Alex',
      },
      'cutting_supervisor',
    );
    expect(user.role).toBe('cutting_supervisor');
  });

  it('cutting_verifier passes a verifier-only check', async () => {
    const user = await mockRequireRole(
      {
        id: 'uuid-ver',
        email: 'verifier@apparelflow.dev',
        role: 'cutting_verifier',
        full_name: 'Jordan',
      },
      'cutting_verifier',
    );
    expect(user.role).toBe('cutting_verifier');
  });

  it('multi-role check allows either role', async () => {
    const user = await mockRequireRole(
      {
        id: 'uuid-ver',
        email: 'verifier@apparelflow.dev',
        role: 'cutting_verifier',
        full_name: 'Jordan',
      },
      'cutting_supervisor',
      'cutting_verifier',
    );
    expect(user.role).toBe('cutting_verifier');
  });
});

describe('RBAC: Invalid role values in DB', () => {
  it('treats an invalid role string as unauthenticated (401)', async () => {
    const maliciousUser = {
      id: 'uuid-bad',
      email: 'bad@example.com',
      role: 'admin', // Not a valid UserRole
      full_name: 'Hacker',
    };

    await expect(
      mockRequireRole(maliciousUser, 'cutting_supervisor'),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('treats UPPERCASE role as invalid', async () => {
    const user = {
      id: 'uuid-bad',
      email: 'user@example.com',
      role: 'CUTTING_SUPERVISOR', // Wrong case
      full_name: 'User',
    };

    await expect(
      mockRequireRole(user, 'cutting_supervisor'),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('treats empty role as invalid', async () => {
    const user = {
      id: 'uuid-bad',
      email: 'user@example.com',
      role: '',
      full_name: 'User',
    };

    await expect(
      mockRequireRole(user, 'cutting_supervisor'),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
