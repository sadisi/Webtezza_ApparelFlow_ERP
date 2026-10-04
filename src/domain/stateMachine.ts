/**
 * Domain: State Machine
 *
 * Centralized state transition rules for cutting order statuses.
 *
 * Workflow Rules:
 *   CUTTING_IN_PROGRESS -> PENDING_VERIFICATION (or COUNT_QC -> PENDING_VERIFICATION)
 *   PENDING_VERIFICATION -> REJECTED
 *   PENDING_VERIFICATION -> VERIFIED  (Strict approval gate required)
 *   REJECTED             -> PENDING_VERIFICATION (Re-verification after fix)
 *   VERIFIED             -> SEWING_IN_PROGRESS   (Queue entry gate)
 *
 * Arbitrary or backwards status jumps are strictly prohibited.
 */

import { OrderStatus } from '@/src/types';
import { InvalidStateTransitionError } from './errors';

/** Matrix of allowed (from -> to) status transitions */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  CUTTING_IN_PROGRESS: ['PENDING_VERIFICATION', 'COUNT_QC'],
  COUNT_QC: ['PENDING_VERIFICATION'],
  PENDING_VERIFICATION: ['VERIFIED', 'REJECTED'],
  REJECTED: ['PENDING_VERIFICATION'],
  VERIFIED: ['SEWING_IN_PROGRESS'],
  SEWING_IN_PROGRESS: [], // Terminal state in cutting subsystem
};

/**
 * Checks if a transition from `from` status to `to` status is allowed.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false; // No self-transitions
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that a status transition is valid.
 * Throws `InvalidStateTransitionError` if the transition is prohibited.
 */
export function assertValidTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}
