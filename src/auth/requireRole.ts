/**
 * Auth: Server-side role guard.
 *
 * Every protected API route and Server Action MUST call this
 * before touching any business data.
 *
 * Behaviour:
 *   Not authenticated → throws AuthError(401)
 *   Wrong role        → throws AuthError(403)
 *   Correct role      → returns AuthenticatedUser (never null)
 *
 * SECURITY:
 *   The role check is always performed server-side against the
 *   database profile. Client-supplied roles are never trusted.
 *   Frontend disabled buttons and navigation guards are NOT security —
 *   this function is the only real security gate.
 */

import { getServerUser, type AuthenticatedUser } from '@/src/auth/getServerSession';
import { AuthError, type UserRole } from '@/src/auth/roles';
import { NextResponse } from 'next/server';

/**
 * Asserts that the current request is authenticated and has one
 * of the allowed roles.
 *
 * @throws AuthError(401) if not authenticated
 * @throws AuthError(403) if authenticated but wrong role
 * @returns AuthenticatedUser with guaranteed non-null role
 */
export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await getServerUser();

  if (!user) {
    throw new AuthError(401, 'Authentication required');
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      403,
      `Access denied. Required role(s): ${allowedRoles.join(', ')}. ` +
        `Your role: ${user.role}`,
    );
  }

  return user;
}

/**
 * Converts an AuthError into the appropriate NextResponse.
 * Use in API route catch blocks.
 *
 * @example
 * try {
 *   const user = await requireRole('cutting_verifier');
 *   // ... handler logic
 * } catch (err) {
 *   return authErrorResponse(err);
 * }
 */
export function authErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode },
    );
  }
  // Re-throw non-auth errors so they bubble as 500
  throw err;
}
