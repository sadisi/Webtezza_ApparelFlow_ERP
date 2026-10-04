/**
 * Auth: Role definitions, permissions matrix, and error types.
 *
 * This is the single source of truth for role constants.
 * Never define roles inline elsewhere in the codebase.
 */

export const USER_ROLES = [
  'cutting_supervisor',
  'cutting_verifier',
  'sewing_supervisor',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Branded error for authentication failures. */
export class AuthError extends Error {
  constructor(
    public readonly statusCode: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Narrow a string to a UserRole. Returns null if invalid. */
export function parseRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null;
  if ((USER_ROLES as readonly string[]).includes(value)) {
    return value as UserRole;
  }
  return null;
}

/**
 * RBAC permissions matrix.
 * Defines what each role is allowed to do — single source of truth.
 */
export const ROLE_PERMISSIONS = {
  cutting_supervisor: {
    canCreateOrder: true,
    canSubmitForVerification: true,
    canViewOwnOrders: true,
    canAccessVerification: false,
    canApproveVerification: false,
    canRejectVerification: false,
    canAccessSewingQueue: false,
    canStartSewing: false,
  },
  cutting_verifier: {
    canCreateOrder: false,
    canSubmitForVerification: false,
    canViewOwnOrders: false,
    canAccessVerification: true,
    canApproveVerification: true,
    canRejectVerification: true,
    canAccessSewingQueue: false,
    canStartSewing: false,
  },
  sewing_supervisor: {
    canCreateOrder: false,
    canSubmitForVerification: false,
    canViewOwnOrders: false,
    canAccessVerification: false,
    canApproveVerification: false,
    canRejectVerification: false,
    canAccessSewingQueue: true,
    canStartSewing: true,
  },
} as const satisfies Record<UserRole, Record<string, boolean>>;
