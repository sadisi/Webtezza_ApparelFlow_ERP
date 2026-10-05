/**
 * Integration Tests: Sewing Supervisor Workflow & Sewing Queue Isolation (Phase 9)
 *
 * Validates:
 *   1. Authorization rules for sewing_supervisor, cutting_supervisor, and cutting_verifier
 *   2. DB Query isolation — non-VERIFIED / non-SEWING_IN_PROGRESS orders never appear in sewing queue
 *   3. State Machine transitions:
 *      - VERIFIED -> SEWING_IN_PROGRESS succeeds
 *      - CUTTING_IN_PROGRESS -> SEWING_IN_PROGRESS fails
 *      - PENDING_VERIFICATION -> SEWING_IN_PROGRESS fails
 *      - REJECTED -> SEWING_IN_PROGRESS fails
 *      - COUNT_QC -> SEWING_IN_PROGRESS fails
 *      - SEWING_IN_PROGRESS -> SEWING_IN_PROGRESS fails
 *   4. Client security — submitting arbitrary payload status cannot bypass server transition gates
 */

import { describe, it, expect, vi } from 'vitest';
import { ROLE_PERMISSIONS } from '@/src/auth/roles';
import { canTransition, assertValidTransition } from '@/src/domain/stateMachine';
import { InvalidStateTransitionError } from '@/src/domain/errors';
import {
  getSewingQueueService,
  getSewingOrderDetailService,
  startSewingService,
} from '@/src/services/sewingQueueService';
import { getSewingQueueOrders } from '@/src/db/queries/sewingQueue';
import { AuthError } from '@/src/auth/roles';
import { SupabaseClient } from '@supabase/supabase-js';

const MOCK_ORDER_VERIFIED = {
  id: 'o-verified-100',
  recipe_id: 'r1',
  created_by: 'u-sup-1',
  fabric_roll_id: 'ROLL-101',
  target_quantity: 100,
  actual_fabric_used: 185,
  expected_fabric: 180,
  wastage_pct: 2.78,
  status: 'VERIFIED' as const,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  recipes: {
    id: 'r1',
    name: 'Casual Blouse',
    code: 'REC-BL01',
    category: 'Blouse',
    standard_fabric_yards: 1.8,
    wastage_cap_pct: 5.0,
  },
};

const MOCK_ORDER_CUTTING = { ...MOCK_ORDER_VERIFIED, id: 'o-cutting-101', status: 'CUTTING_IN_PROGRESS' as const };
const MOCK_ORDER_PENDING = { ...MOCK_ORDER_VERIFIED, id: 'o-pending-102', status: 'PENDING_VERIFICATION' as const };
const MOCK_ORDER_REJECTED = { ...MOCK_ORDER_VERIFIED, id: 'o-rejected-103', status: 'REJECTED' as const };
const MOCK_ORDER_COUNT_QC = { ...MOCK_ORDER_VERIFIED, id: 'o-countqc-104', status: 'COUNT_QC' as const };
const MOCK_ORDER_SEWING = { ...MOCK_ORDER_VERIFIED, id: 'o-sewing-105', status: 'SEWING_IN_PROGRESS' as const };

function createMockSewingSupabaseClient(targetOrder: Record<string, unknown> = MOCK_ORDER_VERIFIED) {
  let queriedInStatuses: string[] | null = null;
  let updatedStatus: string | null = null;

  const allOrders = [
    MOCK_ORDER_VERIFIED,
    MOCK_ORDER_CUTTING,
    MOCK_ORDER_PENDING,
    MOCK_ORDER_REJECTED,
    MOCK_ORDER_COUNT_QC,
    MOCK_ORDER_SEWING,
  ];

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'cutting_orders') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn((column: string, values: string[]) => {
            if (column === 'status') queriedInStatuses = values;
            return {
              order: vi.fn().mockResolvedValue({
                data: allOrders.filter((o) => values.includes(o.status)),
                error: null,
              }),
            };
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: targetOrder, error: null }),
          update: vi.fn((updateData: Record<string, unknown>) => {
            updatedStatus = updateData['status'] as string;
            return {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...targetOrder, ...updateData },
                error: null,
              }),
            };
          }),
        };
      }

      if (table === 'verification_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      return {};
    }),
  } as unknown as SupabaseClient;

  return {
    client,
    getQueriedInStatuses: () => queriedInStatuses,
    getUpdatedStatus: () => updatedStatus,
  };
}

describe('Phase 9 — Sewing Supervisor Role Authorization', () => {
  it('sewing_supervisor has permissions to access sewing queue and start sewing', () => {
    const perms = ROLE_PERMISSIONS['sewing_supervisor'];
    expect(perms.canAccessSewingQueue).toBe(true);
    expect(perms.canStartSewing).toBe(true);
    expect(perms.canCreateOrder).toBe(false);
    expect(perms.canAccessVerification).toBe(false);
  });

  it('cutting_supervisor cannot access sewing queue or start sewing', async () => {
    const perms = ROLE_PERMISSIONS['cutting_supervisor'];
    expect(perms.canAccessSewingQueue).toBe(false);
    expect(perms.canStartSewing).toBe(false);

    const { client } = createMockSewingSupabaseClient();
    const user = { id: 'u-sup-1', role: 'cutting_supervisor' as const };

    await expect(getSewingQueueService(user, client)).rejects.toThrow(AuthError);
    await expect(startSewingService(MOCK_ORDER_VERIFIED.id, user, client)).rejects.toThrow(AuthError);
  });

  it('cutting_verifier cannot access sewing queue or start sewing', async () => {
    const perms = ROLE_PERMISSIONS['cutting_verifier'];
    expect(perms.canAccessSewingQueue).toBe(false);
    expect(perms.canStartSewing).toBe(false);

    const { client } = createMockSewingSupabaseClient();
    const user = { id: 'u-ver-1', role: 'cutting_verifier' as const };

    await expect(getSewingQueueService(user, client)).rejects.toThrow(AuthError);
    await expect(startSewingService(MOCK_ORDER_VERIFIED.id, user, client)).rejects.toThrow(AuthError);
  });
});

describe('Phase 9 — Sewing Queue DB Query Isolation (TEST 5)', () => {
  it('TEST 5: DB query strictly filters status IN (VERIFIED, SEWING_IN_PROGRESS)', async () => {
    const { client, getQueriedInStatuses } = createMockSewingSupabaseClient();

    const orders = await getSewingQueueOrders(client, 'ALL');
    const statuses = getQueriedInStatuses();

    expect(statuses).toEqual(['VERIFIED', 'SEWING_IN_PROGRESS']);
    expect(orders.every((o) => o.status === 'VERIFIED' || o.status === 'SEWING_IN_PROGRESS')).toBe(true);
  });

  it('PENDING_VERIFICATION orders never appear in sewing queue', async () => {
    const { client } = createMockSewingSupabaseClient();
    const orders = await getSewingQueueOrders(client, 'ALL');
    expect(orders.some((o) => o.status === 'PENDING_VERIFICATION')).toBe(false);
  });

  it('REJECTED orders never appear in sewing queue', async () => {
    const { client } = createMockSewingSupabaseClient();
    const orders = await getSewingQueueOrders(client, 'ALL');
    expect(orders.some((o) => o.status === 'REJECTED')).toBe(false);
  });

  it('CUTTING_IN_PROGRESS orders never appear in sewing queue', async () => {
    const { client } = createMockSewingSupabaseClient();
    const orders = await getSewingQueueOrders(client, 'ALL');
    expect(orders.some((o) => o.status === 'CUTTING_IN_PROGRESS')).toBe(false);
  });

  it('COUNT_QC orders never appear in sewing queue', async () => {
    const { client } = createMockSewingSupabaseClient();
    const orders = await getSewingQueueOrders(client, 'ALL');
    expect(orders.some((o) => o.status === 'COUNT_QC')).toBe(false);
  });
});

describe('Phase 9 — Sewing State Machine Transition Rules', () => {
  it('VERIFIED -> SEWING_IN_PROGRESS succeeds', () => {
    expect(canTransition('VERIFIED', 'SEWING_IN_PROGRESS')).toBe(true);
    expect(() => assertValidTransition('VERIFIED', 'SEWING_IN_PROGRESS')).not.toThrow();
  });

  it('CUTTING_IN_PROGRESS -> SEWING_IN_PROGRESS fails', () => {
    expect(canTransition('CUTTING_IN_PROGRESS', 'SEWING_IN_PROGRESS')).toBe(false);
    expect(() => assertValidTransition('CUTTING_IN_PROGRESS', 'SEWING_IN_PROGRESS')).toThrow(
      InvalidStateTransitionError,
    );
  });

  it('PENDING_VERIFICATION -> SEWING_IN_PROGRESS fails', () => {
    expect(canTransition('PENDING_VERIFICATION', 'SEWING_IN_PROGRESS')).toBe(false);
    expect(() => assertValidTransition('PENDING_VERIFICATION', 'SEWING_IN_PROGRESS')).toThrow(
      InvalidStateTransitionError,
    );
  });

  it('REJECTED -> SEWING_IN_PROGRESS fails', () => {
    expect(canTransition('REJECTED', 'SEWING_IN_PROGRESS')).toBe(false);
    expect(() => assertValidTransition('REJECTED', 'SEWING_IN_PROGRESS')).toThrow(
      InvalidStateTransitionError,
    );
  });

  it('COUNT_QC -> SEWING_IN_PROGRESS fails', () => {
    expect(canTransition('COUNT_QC', 'SEWING_IN_PROGRESS')).toBe(false);
    expect(() => assertValidTransition('COUNT_QC', 'SEWING_IN_PROGRESS')).toThrow(
      InvalidStateTransitionError,
    );
  });

  it('SEWING_IN_PROGRESS -> SEWING_IN_PROGRESS fails (no self-transitions)', () => {
    expect(canTransition('SEWING_IN_PROGRESS', 'SEWING_IN_PROGRESS')).toBe(false);
    expect(() => assertValidTransition('SEWING_IN_PROGRESS', 'SEWING_IN_PROGRESS')).toThrow(
      InvalidStateTransitionError,
    );
  });
});

describe('Phase 9 — Start Sewing Application Service & Security Attacks', () => {
  const sewingUser = { id: 'u-sew-1', role: 'sewing_supervisor' as const };

  it('starts sewing for VERIFIED order and returns updated SEWING_IN_PROGRESS order', async () => {
    const { client, getUpdatedStatus } = createMockSewingSupabaseClient(MOCK_ORDER_VERIFIED);

    const updated = await startSewingService(MOCK_ORDER_VERIFIED.id, sewingUser, client);

    expect(getUpdatedStatus()).toBe('SEWING_IN_PROGRESS');
    expect(updated.status).toBe('SEWING_IN_PROGRESS');
  });

  it('rejects start sewing for UNVERIFIED order (CUTTING_IN_PROGRESS)', async () => {
    const { client } = createMockSewingSupabaseClient(MOCK_ORDER_CUTTING);

    await expect(
      startSewingService(MOCK_ORDER_CUTTING.id, sewingUser, client),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  it('rejects start sewing for PENDING_VERIFICATION order', async () => {
    const { client } = createMockSewingSupabaseClient(MOCK_ORDER_PENDING);

    await expect(
      startSewingService(MOCK_ORDER_PENDING.id, sewingUser, client),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  it('rejects start sewing for REJECTED order', async () => {
    const { client } = createMockSewingSupabaseClient(MOCK_ORDER_REJECTED);

    await expect(
      startSewingService(MOCK_ORDER_REJECTED.id, sewingUser, client),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  it('fetches sewing order detail for authorized sewing_supervisor', async () => {
    const { client } = createMockSewingSupabaseClient(MOCK_ORDER_VERIFIED);

    const detail = await getSewingOrderDetailService(MOCK_ORDER_VERIFIED.id, sewingUser, client);

    expect(detail.id).toBe(MOCK_ORDER_VERIFIED.id);
    expect(detail.status).toBe('VERIFIED');
  });
});
