/**
 * Unit Tests: Domain State Machine
 *
 * Validates state transition logic and state machine error throwing.
 */

import { describe, it, expect } from 'vitest';
import {
  canTransition,
  assertValidTransition,
  InvalidStateTransitionError,
} from '@/src/domain';
import { OrderStatus } from '@/src/types';

describe('Domain State Machine', () => {
  describe('Valid State Transitions', () => {
    it('allows CUTTING_IN_PROGRESS -> PENDING_VERIFICATION', () => {
      expect(canTransition('CUTTING_IN_PROGRESS', 'PENDING_VERIFICATION')).toBe(true);
      expect(() =>
        assertValidTransition('CUTTING_IN_PROGRESS', 'PENDING_VERIFICATION'),
      ).not.toThrow();
    });

    it('allows CUTTING_IN_PROGRESS -> COUNT_QC', () => {
      expect(canTransition('CUTTING_IN_PROGRESS', 'COUNT_QC')).toBe(true);
      expect(() =>
        assertValidTransition('CUTTING_IN_PROGRESS', 'COUNT_QC'),
      ).not.toThrow();
    });

    it('allows COUNT_QC -> PENDING_VERIFICATION', () => {
      expect(canTransition('COUNT_QC', 'PENDING_VERIFICATION')).toBe(true);
      expect(() =>
        assertValidTransition('COUNT_QC', 'PENDING_VERIFICATION'),
      ).not.toThrow();
    });

    it('allows PENDING_VERIFICATION -> REJECTED', () => {
      expect(canTransition('PENDING_VERIFICATION', 'REJECTED')).toBe(true);
      expect(() =>
        assertValidTransition('PENDING_VERIFICATION', 'REJECTED'),
      ).not.toThrow();
    });

    it('allows PENDING_VERIFICATION -> VERIFIED', () => {
      expect(canTransition('PENDING_VERIFICATION', 'VERIFIED')).toBe(true);
      expect(() =>
        assertValidTransition('PENDING_VERIFICATION', 'VERIFIED'),
      ).not.toThrow();
    });

    it('allows REJECTED -> PENDING_VERIFICATION (re-verification path)', () => {
      expect(canTransition('REJECTED', 'PENDING_VERIFICATION')).toBe(true);
      expect(() =>
        assertValidTransition('REJECTED', 'PENDING_VERIFICATION'),
      ).not.toThrow();
    });

    it('allows VERIFIED -> SEWING_IN_PROGRESS (queue entry gate)', () => {
      expect(canTransition('VERIFIED', 'SEWING_IN_PROGRESS')).toBe(true);
      expect(() =>
        assertValidTransition('VERIFIED', 'SEWING_IN_PROGRESS'),
      ).not.toThrow();
    });
  });

  describe('Invalid State Transitions', () => {
    it('rejects CUTTING_IN_PROGRESS -> VERIFIED (skipping verification)', () => {
      expect(canTransition('CUTTING_IN_PROGRESS', 'VERIFIED')).toBe(false);
      expect(() =>
        assertValidTransition('CUTTING_IN_PROGRESS', 'VERIFIED'),
      ).toThrow(InvalidStateTransitionError);
    });

    it('rejects CUTTING_IN_PROGRESS -> SEWING_IN_PROGRESS (bypassing gate)', () => {
      expect(canTransition('CUTTING_IN_PROGRESS', 'SEWING_IN_PROGRESS')).toBe(false);
      expect(() =>
        assertValidTransition('CUTTING_IN_PROGRESS', 'SEWING_IN_PROGRESS'),
      ).toThrow(InvalidStateTransitionError);
    });

    it('rejects PENDING_VERIFICATION -> SEWING_IN_PROGRESS (bypassing approval)', () => {
      expect(canTransition('PENDING_VERIFICATION', 'SEWING_IN_PROGRESS')).toBe(false);
      expect(() =>
        assertValidTransition('PENDING_VERIFICATION', 'SEWING_IN_PROGRESS'),
      ).toThrow(InvalidStateTransitionError);
    });

    it('rejects REJECTED -> SEWING_IN_PROGRESS (rejected order into queue)', () => {
      expect(canTransition('REJECTED', 'SEWING_IN_PROGRESS')).toBe(false);
      expect(() =>
        assertValidTransition('REJECTED', 'SEWING_IN_PROGRESS'),
      ).toThrow(InvalidStateTransitionError);
    });

    it('rejects REJECTED -> VERIFIED (bypassing re-verification step)', () => {
      expect(canTransition('REJECTED', 'VERIFIED')).toBe(false);
      expect(() =>
        assertValidTransition('REJECTED', 'VERIFIED'),
      ).toThrow(InvalidStateTransitionError);
    });

    it('rejects VERIFIED -> PENDING_VERIFICATION (backwards jump)', () => {
      expect(canTransition('VERIFIED', 'PENDING_VERIFICATION')).toBe(false);
      expect(() =>
        assertValidTransition('VERIFIED', 'PENDING_VERIFICATION'),
      ).toThrow(InvalidStateTransitionError);
    });

    it('rejects SEWING_IN_PROGRESS -> any other status (terminal state)', () => {
      const statuses: OrderStatus[] = [
        'CUTTING_IN_PROGRESS',
        'PENDING_VERIFICATION',
        'COUNT_QC',
        'VERIFIED',
        'REJECTED',
      ];
      statuses.forEach((status) => {
        expect(canTransition('SEWING_IN_PROGRESS', status)).toBe(false);
        expect(() =>
          assertValidTransition('SEWING_IN_PROGRESS', status),
        ).toThrow(InvalidStateTransitionError);
      });
    });

    it('rejects self transitions', () => {
      expect(canTransition('PENDING_VERIFICATION', 'PENDING_VERIFICATION')).toBe(false);
      expect(() =>
        assertValidTransition('PENDING_VERIFICATION', 'PENDING_VERIFICATION'),
      ).toThrow(InvalidStateTransitionError);
    });
  });
});
