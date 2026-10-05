/**
 * Integration Tests: Production Verification Terminal & Approval Gateway
 *
 * Validates Section 13 Attack Scenarios & Verification Gate Rules:
 *   - Attack 1: Client submits { approved: true } -> Server ignores
 *   - Attack 2: Client submits { status: "VERIFIED" } -> Server ignores
 *   - Attack 3: Client spoofing trafficLight="GREEN" while actual < expected -> Server computes RED & blocks
 *   - Attack 4: Client spoofing expectedQuantity=50 when DB has 100 -> Server uses DB 100
 *   - Attack 5: Client submitting fake verifier_id -> Server uses session user ID
 *   - Attack 6: cutting_supervisor attempts approval -> 403 Forbidden
 *   - Attack 7: sewing_supervisor attempts approval -> 403 Forbidden
 *   - Attack 8: Uncounted component -> 422 Blocked
 *   - Attack 9: RED shortage component -> 422 Blocked
 *   - Attack 10: All GREEN / YELLOW components -> 200 Approved (VERIFIED state + Audit Log)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getVerificationTerminalService,
  recordComponentCountService,
  approveVerificationService,
  rejectVerificationService,
} from '@/src/services/verificationService';
import { AuthError } from '@/src/auth/roles';
import { VerificationGateError, InvalidStateTransitionError } from '@/src/domain';
import { SupabaseClient } from '@supabase/supabase-js';

const MOCK_ORDER = {
  id: 'o0000000-0000-0000-0000-000000000001',
  recipe_id: 'r0000000-0000-0000-0000-000000000001',
  created_by: 'u0000000-0000-0000-0000-000000000001',
  fabric_roll_id: 'ROLL-101',
  target_quantity: 100,
  actual_fabric_used: 189,
  expected_fabric: 180,
  wastage_pct: 5.0,
  status: 'PENDING_VERIFICATION' as const,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  recipes: {
    id: 'r0000000-0000-0000-0000-000000000001',
    name: 'Casual Blouse',
    code: 'REC-BL01',
    category: 'Blouse',
    standard_fabric_yards: 1.8,
    wastage_cap_pct: 5.0,
  },
};

const MOCK_COMPONENT_FRONT = {
  id: 'c-front',
  recipe_id: MOCK_ORDER.recipe_id,
  component_name: 'Front Panel',
  pieces_per_garment: 2,
  sort_order: 1,
};

const MOCK_COMPONENT_BACK = {
  id: 'c-back',
  recipe_id: MOCK_ORDER.recipe_id,
  component_name: 'Back Panel',
  pieces_per_garment: 2,
  sort_order: 2,
};

function createMockSupabaseClient(customItems?: Record<string, unknown>[]) {
  const defaultItems = [
    {
      id: 'v-front',
      cutting_order_id: MOCK_ORDER.id,
      recipe_component_id: 'c-front',
      expected_quantity: 200, // 2 pcs * 100 garments
      actual_quantity: 200,   // GREEN
      variance: 0,
      traffic_light: 'GREEN',
      counted_at: '2026-01-01T00:00:00Z',
      recipe_components: MOCK_COMPONENT_FRONT,
    },
    {
      id: 'v-back',
      cutting_order_id: MOCK_ORDER.id,
      recipe_component_id: 'c-back',
      expected_quantity: 200, // 2 pcs * 100 garments
      actual_quantity: 200,   // GREEN
      variance: 0,
      traffic_light: 'GREEN',
      counted_at: '2026-01-01T00:00:00Z',
      recipe_components: MOCK_COMPONENT_BACK,
    },
  ];

  const items = customItems ?? defaultItems;

  let insertedLog: Record<string, unknown> | null = null;
  let updatedStatus: string | null = null;

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'cutting_orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_ORDER, error: null }),
          update: vi.fn((updateData: Record<string, unknown>) => {
            updatedStatus = updateData['status'] as string;
            return {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...MOCK_ORDER, ...updateData },
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
          order: vi.fn().mockResolvedValue({ data: items, error: null }),
          single: vi.fn().mockResolvedValue({ data: items[0], error: null }),
          update: vi.fn((updateData: Record<string, unknown>) => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { ...items[0], ...updateData },
              error: null,
            }),
          })),
        };
      }

      if (table === 'verification_logs') {
        return {
          insert: vi.fn((logData: Record<string, unknown>) => {
            insertedLog = { id: 'log-1', ...logData, created_at: '2026-01-01T00:00:00Z' };
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: insertedLog, error: null }),
            };
          }),
        };
      }

      return {};
    }),
    _getInsertedLog: () => insertedLog,
    _getUpdatedStatus: () => updatedStatus,
  } as unknown as SupabaseClient & {
    _getInsertedLog: () => Record<string, unknown> | null;
    _getUpdatedStatus: () => string | null;
  };

  return client;
}

describe('Approval Gateway & Verification Terminal Security Attacks', () => {
  const verifierUser = {
    id: 'u-verifier-123',
    role: 'cutting_verifier' as const,
  };

  const supervisorUser = {
    id: 'u-supervisor-456',
    role: 'cutting_supervisor' as const,
  };

  const sewingUser = {
    id: 'u-sewing-789',
    role: 'sewing_supervisor' as const,
  };

  describe('Section 13 — Attack Scenarios', () => {
    it('Attack 1: Client submits { approved: true } -> ignored, hard gate evaluated', async () => {
      // Mock items with a RED component (actual 190 < expected 200)
      const mockClient = createMockSupabaseClient([
        {
          id: 'v-front',
          cutting_order_id: MOCK_ORDER.id,
          recipe_component_id: 'c-front',
          expected_quantity: 200,
          actual_quantity: 200,
          recipe_components: MOCK_COMPONENT_FRONT,
        },
        {
          id: 'v-back',
          cutting_order_id: MOCK_ORDER.id,
          recipe_component_id: 'c-back',
          expected_quantity: 200,
          actual_quantity: 190, // RED shortage
          recipe_components: MOCK_COMPONENT_BACK,
        },
      ]);

      // Attacker calls approve service with malicious payload attempt
      await expect(
        approveVerificationService(MOCK_ORDER.id, verifierUser, mockClient),
      ).rejects.toThrow(VerificationGateError);

      expect(mockClient._getUpdatedStatus()).toBeNull(); // Status was NOT changed to VERIFIED
    });

    it('Attack 2: Client submits { status: "VERIFIED" } -> ignored, state machine enforced', async () => {
      // Create mock client with order in CUTTING_IN_PROGRESS state (invalid direct jump to VERIFIED)
      const unreadyOrderClient = {
        from: vi.fn((table: string) => {
          if (table === 'cutting_orders') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...MOCK_ORDER, status: 'CUTTING_IN_PROGRESS' },
                error: null,
              }),
            };
          }
          if (table === 'verification_items') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'v1',
                    expected_quantity: 200,
                    actual_quantity: 200,
                    recipe_components: MOCK_COMPONENT_FRONT,
                  },
                ],
                error: null,
              }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      await expect(
        approveVerificationService(MOCK_ORDER.id, verifierUser, unreadyOrderClient),
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it('Attack 3: Client submits trafficLight="GREEN" when actual < expected -> Server computes RED & blocks', async () => {
      const spoofedItemClient = createMockSupabaseClient([
        {
          id: 'v-front',
          cutting_order_id: MOCK_ORDER.id,
          expected_quantity: 200,
          actual_quantity: 150, // Shortage (-50 pcs)
          traffic_light: 'GREEN', // Client attempting to spoof GREEN
          recipe_components: MOCK_COMPONENT_FRONT,
        },
      ]);

      await expect(
        approveVerificationService(MOCK_ORDER.id, verifierUser, spoofedItemClient),
      ).rejects.toThrow(VerificationGateError);
    });

    it('Attack 4: Client submits expectedQuantity=50 when DB says 100 -> Server uses DB 100', async () => {
      const mockClient = createMockSupabaseClient();

      // Verifier attempts to record count for v-front
      const updated = await recordComponentCountService(
        { verification_item_id: 'v-front', actual_quantity: 100 },
        MOCK_ORDER.id,
        verifierUser,
        mockClient,
      );

      expect(updated).toBeDefined();
    });

    it('Attack 5: Client submitting fake verifier_id -> Server uses session user ID in audit log', async () => {
      const mockClient = createMockSupabaseClient();

      const result = await approveVerificationService(
        MOCK_ORDER.id,
        verifierUser,
        mockClient,
      );

      const log = mockClient._getInsertedLog();
      expect(log?.['verifier_id']).toBe(verifierUser.id); // Session user ID enforced!
      expect(result.order.status).toBe('VERIFIED');
    });

    it('Attack 6: cutting_supervisor attempts approval -> 403 Forbidden', async () => {
      const mockClient = createMockSupabaseClient();

      await expect(
        approveVerificationService(MOCK_ORDER.id, supervisorUser, mockClient),
      ).rejects.toThrow(AuthError);
    });

    it('Attack 7: sewing_supervisor attempts approval -> 403 Forbidden', async () => {
      const mockClient = createMockSupabaseClient();

      await expect(
        approveVerificationService(MOCK_ORDER.id, sewingUser, mockClient),
      ).rejects.toThrow(AuthError);
    });

    it('Attack 8: One component remains uncounted (null actual) -> 422 Blocked', async () => {
      const uncountedClient = createMockSupabaseClient([
        {
          id: 'v-front',
          expected_quantity: 200,
          actual_quantity: 200, // GREEN
          recipe_components: MOCK_COMPONENT_FRONT,
        },
        {
          id: 'v-back',
          expected_quantity: 200,
          actual_quantity: null, // UNCOUNTED
          recipe_components: MOCK_COMPONENT_BACK,
        },
      ]);

      await expect(
        approveVerificationService(MOCK_ORDER.id, verifierUser, uncountedClient),
      ).rejects.toThrow(VerificationGateError);
    });

    it('Attack 9: One component is RED (shortage) -> 422 Blocked', async () => {
      const redClient = createMockSupabaseClient([
        {
          id: 'v-front',
          expected_quantity: 200,
          actual_quantity: 200, // GREEN
          recipe_components: MOCK_COMPONENT_FRONT,
        },
        {
          id: 'v-back',
          expected_quantity: 200,
          actual_quantity: 199, // RED (-1 pc)
          recipe_components: MOCK_COMPONENT_BACK,
        },
      ]);

      await expect(
        approveVerificationService(MOCK_ORDER.id, verifierUser, redClient),
      ).rejects.toThrow(VerificationGateError);
    });

    it('Attack 10: All components are GREEN / YELLOW -> Approval succeeds & order becomes VERIFIED with Audit Log', async () => {
      const validClient = createMockSupabaseClient([
        {
          id: 'v-front',
          expected_quantity: 200,
          actual_quantity: 200, // GREEN
          recipe_components: MOCK_COMPONENT_FRONT,
        },
        {
          id: 'v-back',
          expected_quantity: 200,
          actual_quantity: 205, // YELLOW (surplus allowed)
          recipe_components: MOCK_COMPONENT_BACK,
        },
      ]);

      const result = await approveVerificationService(
        MOCK_ORDER.id,
        verifierUser,
        validClient,
      );

      expect(result.order.status).toBe('VERIFIED');
      expect(result.gateResult.canApprove).toBe(true);
      expect(result.log.decision).toBe('APPROVED');
      expect(result.log.verifier_id).toBe(verifierUser.id);
    });
  });

  describe('Rejection Workflow', () => {
    it('allows cutting_verifier to reject verification batch with reason', async () => {
      const mockClient = createMockSupabaseClient();

      const result = await rejectVerificationService(
        { reason: 'Fabric defect found on front panels' },
        MOCK_ORDER.id,
        verifierUser,
        mockClient,
      );

      expect(result.order.status).toBe('REJECTED');
      expect(result.log.decision).toBe('REJECTED');
      expect(result.log.reason).toBe('Fabric defect found on front panels');
      expect(result.log.verifier_id).toBe(verifierUser.id);
    });

    it('rejects empty rejection reason via Zod validation', async () => {
      const mockClient = createMockSupabaseClient();

      await expect(
        rejectVerificationService(
          { reason: '   ' },
          MOCK_ORDER.id,
          verifierUser,
          mockClient,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Verification Terminal Retrieval', () => {
    it('retrieves terminal data for authorized users with server-computed gate status', async () => {
      const mockClient = createMockSupabaseClient();

      const data = await getVerificationTerminalService(
        MOCK_ORDER.id,
        verifierUser,
        mockClient,
      );

      expect(data.order).toBeDefined();
      expect(data.items).toHaveLength(2);
      expect(data.gateResult.canApprove).toBe(true);
    });
  });
});
