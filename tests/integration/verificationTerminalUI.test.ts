/**
 * Integration & UI logic tests: Cutting Verifier Verification Terminal UI (Phase 8)
 *
 * Verifies:
 *   1. Verification Queue and Terminal role authorization rules
 *   2. Component count input validation (Zod schema and domain bounds)
 *   3. Traffic light states (GREEN, YELLOW, RED, UNCOUNTED) & variance computation
 *   4. Verification Gate summary & approval/rejection decision handling
 *   5. Protection against duplicate submission and unauthorized access
 */

import { describe, it, expect, vi } from 'vitest';
import { ROLE_PERMISSIONS } from '@/src/auth/roles';
import {
  componentCountSchema,
  rejectVerificationSchema,
} from '@/src/validation/verificationSchemas';
import {
  computeTrafficLight,
  computeVariance,
  evaluateVerificationGate,
} from '@/src/domain/trafficLight';
import {
  recordComponentCountService,
  approveVerificationService,
  rejectVerificationService,
  getVerificationTerminalService,
} from '@/src/services/verificationService';
import { AuthError } from '@/src/auth/roles';
import { VerificationGateError } from '@/src/domain';
import { SupabaseClient } from '@supabase/supabase-js';

const MOCK_ORDER_ID = 'o1000000-0000-0000-0000-000000000001';

const MOCK_ORDER = {
  id: MOCK_ORDER_ID,
  recipe_id: 'r1000000-0000-0000-0000-000000000001',
  created_by: 'u-supervisor-1',
  fabric_roll_id: 'ROLL-200',
  target_quantity: 100,
  actual_fabric_used: 185.0,
  expected_fabric: 180.0,
  wastage_pct: 2.78,
  status: 'PENDING_VERIFICATION' as const,
  notes: 'Verification test batch',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  recipes: {
    id: 'r1000000-0000-0000-0000-000000000001',
    name: 'Casual Shirt',
    code: 'REC-CS01',
    category: 'Shirt',
    standard_fabric_yards: 1.8,
    wastage_cap_pct: 5.0,
  },
};

const MOCK_COMP_FRONT = {
  id: 'rc-front',
  recipe_id: MOCK_ORDER.recipe_id,
  component_name: 'Front Panel',
  pieces_per_garment: 2,
  sort_order: 1,
};

const MOCK_COMP_BACK = {
  id: 'rc-back',
  recipe_id: MOCK_ORDER.recipe_id,
  component_name: 'Back Panel',
  pieces_per_garment: 1,
  sort_order: 2,
};

function createMockTerminalSupabaseClient(customItems?: Record<string, unknown>[]) {
  const defaultItems = [
    {
      id: 'vi-front',
      cutting_order_id: MOCK_ORDER_ID,
      recipe_component_id: 'rc-front',
      expected_quantity: 200,
      actual_quantity: 200,
      variance: 0,
      traffic_light: 'GREEN',
      recipe_components: MOCK_COMP_FRONT,
    },
    {
      id: 'vi-back',
      cutting_order_id: MOCK_ORDER_ID,
      recipe_component_id: 'rc-back',
      expected_quantity: 100,
      actual_quantity: 100,
      variance: 0,
      traffic_light: 'GREEN',
      recipe_components: MOCK_COMP_BACK,
    },
  ];

  const items = customItems ?? defaultItems;
  let updatedStatus: string | null = null;
  let insertedLog: Record<string, unknown> | null = null;

  return {
    client: {
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
              insertedLog = { id: 'log-100', ...logData };
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: insertedLog, error: null }),
              };
            }),
          };
        }

        return {};
      }),
    } as unknown as SupabaseClient,
    getUpdatedStatus: () => updatedStatus,
    getInsertedLog: () => insertedLog,
  };
}

describe('Phase 8 — Verification Queue & Terminal Role Access', () => {
  it('cutting_verifier role is allowed access to verification queue & terminal', () => {
    const perms = ROLE_PERMISSIONS['cutting_verifier'];
    expect(perms.canAccessVerification).toBe(true);
    expect(perms.canApproveVerification).toBe(true);
    expect(perms.canRejectVerification).toBe(true);
  });

  it('cutting_supervisor role is denied verification access', () => {
    const perms = ROLE_PERMISSIONS['cutting_supervisor'];
    expect(perms.canAccessVerification).toBe(false);
    expect(perms.canApproveVerification).toBe(false);
  });

  it('sewing_supervisor role is denied verification access', () => {
    const perms = ROLE_PERMISSIONS['sewing_supervisor'];
    expect(perms.canAccessVerification).toBe(false);
    expect(perms.canApproveVerification).toBe(false);
  });
});

describe('Phase 8 — Component Count Input Validation', () => {
  it('accepts valid integer counts (0 or positive integer)', () => {
    expect(componentCountSchema.parse({ actual_quantity: 0 })).toEqual({ actual_quantity: 0 });
    expect(componentCountSchema.parse({ actual_quantity: 200 })).toEqual({ actual_quantity: 200 });
  });

  it('rejects negative component counts', () => {
    expect(() => componentCountSchema.parse({ actual_quantity: -1 })).toThrow();
    expect(() => componentCountSchema.parse({ actual_quantity: -50 })).toThrow();
  });

  it('rejects non-integer decimal counts', () => {
    expect(() => componentCountSchema.parse({ actual_quantity: 10.5 })).toThrow();
  });

  it('rejects non-numeric string counts', () => {
    expect(() => componentCountSchema.parse({ actual_quantity: 'abc' })).toThrow();
  });
});

describe('Phase 8 — Rejection Reason Validation', () => {
  it('accepts non-empty rejection reasons', () => {
    const valid = rejectVerificationSchema.parse({ reason: 'Shortage on front panel' });
    expect(valid.reason).toBe('Shortage on front panel');
  });

  it('rejects empty or whitespace-only rejection reasons', () => {
    expect(() => rejectVerificationSchema.parse({ reason: '' })).toThrow();
    expect(() => rejectVerificationSchema.parse({ reason: '   ' })).toThrow();
  });
});

describe('Phase 8 — Traffic Light & Variance Calculations', () => {
  it('computes GREEN when actual equals expected', () => {
    expect(computeTrafficLight(200, 200)).toBe('GREEN');
    expect(computeVariance(200, 200)).toBe(0);
  });

  it('computes YELLOW when actual exceeds expected (surplus allowed)', () => {
    expect(computeTrafficLight(200, 205)).toBe('YELLOW');
    expect(computeVariance(200, 205)).toBe(5);
  });

  it('computes RED when actual is less than expected (shortage)', () => {
    expect(computeTrafficLight(200, 190)).toBe('RED');
    expect(computeVariance(200, 190)).toBe(-10);
  });

  it('computes null (UNCOUNTED) when actual quantity is null or undefined', () => {
    expect(computeTrafficLight(200, null)).toBeNull();
    expect(computeTrafficLight(200, undefined)).toBeNull();
    expect(computeVariance(200, null)).toBeNull();
  });
});

describe('Phase 8 — Verification Gate Summary & Approval Decisions', () => {
  it('allows approval when all components are GREEN or YELLOW', () => {
    const items = [
      { expected_quantity: 200, actual_quantity: 200 }, // GREEN
      { expected_quantity: 100, actual_quantity: 105 }, // YELLOW
    ];

    const gateResult = evaluateVerificationGate(items);
    expect(gateResult.canApprove).toBe(true);
    expect(gateResult.greenCount).toBe(1);
    expect(gateResult.yellowCount).toBe(1);
    expect(gateResult.redCount).toBe(0);
    expect(gateResult.uncountedCount).toBe(0);
    expect(gateResult.reasons).toHaveLength(0);
  });

  it('blocks approval when any component is RED (shortage)', () => {
    const items = [
      { component_name: 'Front Panel', expected_quantity: 200, actual_quantity: 195 }, // RED
      { component_name: 'Back Panel', expected_quantity: 100, actual_quantity: 100 },  // GREEN
    ];

    const gateResult = evaluateVerificationGate(items);
    expect(gateResult.canApprove).toBe(false);
    expect(gateResult.redCount).toBe(1);
    expect(gateResult.reasons[0]).toContain("Component 'Front Panel' has a RED shortage");
  });

  it('blocks approval when any component is UNCOUNTED', () => {
    const items = [
      { component_name: 'Front Panel', expected_quantity: 200, actual_quantity: 200 }, // GREEN
      { component_name: 'Back Panel', expected_quantity: 100, actual_quantity: null }, // UNCOUNTED
    ];

    const gateResult = evaluateVerificationGate(items);
    expect(gateResult.canApprove).toBe(false);
    expect(gateResult.uncountedCount).toBe(1);
    expect(gateResult.reasons[0]).toContain("Component 'Back Panel' has not been counted yet.");
  });
});

describe('Phase 8 — Verification Service API Integrations & Security Hard-Stops', () => {
  const verifierUser = { id: 'u-verifier-1', role: 'cutting_verifier' as const };
  const supervisorUser = { id: 'u-supervisor-1', role: 'cutting_supervisor' as const };

  it('submits valid component count and updates terminal state', async () => {
    const { client } = createMockTerminalSupabaseClient();

    const updated = await recordComponentCountService(
      { verification_item_id: 'vi-front', actual_quantity: 200 },
      MOCK_ORDER_ID,
      verifierUser,
      client,
    );

    expect(updated).toBeDefined();
    expect(updated.traffic_light).toBe('GREEN');
  });

  it('blocks non-verifier roles from submitting component counts', async () => {
    const { client } = createMockTerminalSupabaseClient();

    await expect(
      recordComponentCountService(
        { verification_item_id: 'vi-front', actual_quantity: 200 },
        MOCK_ORDER_ID,
        supervisorUser,
        client,
      ),
    ).rejects.toThrow(AuthError);
  });

  it('executes successful approval when gate conditions pass', async () => {
    const { client, getUpdatedStatus, getInsertedLog } = createMockTerminalSupabaseClient([
      {
        id: 'vi-front',
        cutting_order_id: MOCK_ORDER_ID,
        recipe_component_id: 'rc-front',
        expected_quantity: 200,
        actual_quantity: 200, // GREEN
        traffic_light: 'GREEN',
        recipe_components: MOCK_COMP_FRONT,
      },
      {
        id: 'vi-back',
        cutting_order_id: MOCK_ORDER_ID,
        recipe_component_id: 'rc-back',
        expected_quantity: 100,
        actual_quantity: 105, // YELLOW
        traffic_light: 'YELLOW',
        recipe_components: MOCK_COMP_BACK,
      },
    ]);

    const result = await approveVerificationService(MOCK_ORDER_ID, verifierUser, client);

    expect(result.order.status).toBe('VERIFIED');
    expect(getUpdatedStatus()).toBe('VERIFIED');
    expect(getInsertedLog()?.['decision']).toBe('APPROVED');
    expect(getInsertedLog()?.['verifier_id']).toBe(verifierUser.id);
  });

  it('rejects approval when gate conditions fail (RED shortage present)', async () => {
    const { client, getUpdatedStatus } = createMockTerminalSupabaseClient([
      {
        id: 'vi-front',
        cutting_order_id: MOCK_ORDER_ID,
        recipe_component_id: 'rc-front',
        expected_quantity: 200,
        actual_quantity: 180, // RED
        traffic_light: 'RED',
        recipe_components: MOCK_COMP_FRONT,
      },
    ]);

    await expect(
      approveVerificationService(MOCK_ORDER_ID, verifierUser, client),
    ).rejects.toThrow(VerificationGateError);

    expect(getUpdatedStatus()).toBeNull(); // Status was NOT changed to VERIFIED
  });

  it('executes rejection with mandatory reason and writes audit log', async () => {
    const { client, getUpdatedStatus, getInsertedLog } = createMockTerminalSupabaseClient();

    const result = await rejectVerificationService(
      { reason: 'Severe fabric staining on front panel cuts' },
      MOCK_ORDER_ID,
      verifierUser,
      client,
    );

    expect(result.order.status).toBe('REJECTED');
    expect(getUpdatedStatus()).toBe('REJECTED');
    expect(getInsertedLog()?.['decision']).toBe('REJECTED');
    expect(getInsertedLog()?.['reason']).toBe('Severe fabric staining on front panel cuts');
    expect(getInsertedLog()?.['verifier_id']).toBe(verifierUser.id);
  });

  it('fetches terminal data with server-computed gate result', async () => {
    const { client } = createMockTerminalSupabaseClient();

    const terminalData = await getVerificationTerminalService(
      MOCK_ORDER_ID,
      verifierUser,
      client,
    );

    expect(terminalData.order.id).toBe(MOCK_ORDER_ID);
    expect(terminalData.items).toHaveLength(2);
    expect(terminalData.gateResult.canApprove).toBe(true);
  });
});
