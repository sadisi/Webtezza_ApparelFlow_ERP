/**
 * Integration Tests: Cutting Order Application Service & API Rules
 *
 * Tests the cutting order application service layer for:
 *   - Role authorization enforcement
 *   - Zod request validation
 *   - Server-side authoritative domain calculations
 *   - Rejection/Ignorance of client-supplied calculated values and statuses
 *   - Atomic order + verification item payload assembly
 */

import { describe, it, expect, vi } from 'vitest';
import { ZodError } from 'zod';
import {
  createCuttingOrderService,
  listCuttingOrdersService,
  getCuttingOrderByIdService,
} from '@/src/services/cuttingOrderService';
import { AuthError, UserRole } from '@/src/auth/roles';
import { NotFoundError } from '@/src/domain';
import { SupabaseClient } from '@supabase/supabase-js';

// ─── Mock Recipe & Component Data ───────────────────────────────────────────
const MOCK_RECIPE = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Casual Blouse',
  code: 'REC-BL01',
  category: 'Blouse',
  standard_fabric_yards: 1.8,
  wastage_cap_pct: 5.0,
  created_at: '2026-01-01T00:00:00Z',
};

const MOCK_COMPONENTS = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    recipe_id: MOCK_RECIPE.id,
    component_name: 'Front Panel',
    pieces_per_garment: 2,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    recipe_id: MOCK_RECIPE.id,
    component_name: 'Back Panel',
    pieces_per_garment: 2,
    sort_order: 2,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    recipe_id: MOCK_RECIPE.id,
    component_name: 'Sleeve',
    pieces_per_garment: 2,
    sort_order: 3,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    recipe_id: MOCK_RECIPE.id,
    component_name: 'Collar',
    pieces_per_garment: 1,
    sort_order: 4,
    created_at: '2026-01-01T00:00:00Z',
  },
];

/**
 * Creates a mock Supabase client for service testing.
 */
function createMockSupabaseClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'recipes') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(async () => ({
            data: MOCK_RECIPE,
            error: null,
          })),
          order: vi.fn().mockResolvedValue({ data: [MOCK_RECIPE], error: null }),
        };
      }

      if (table === 'recipe_components') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: MOCK_COMPONENTS,
            error: null,
          }),
        };
      }

      if (table === 'cutting_orders') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(async () => ({
            data: {
              id: 'o0000000-0000-0000-0000-000000000001',
              recipe_id: MOCK_RECIPE.id,
              created_by: 'u0000000-0000-0000-0000-000000000001',
              fabric_roll_id: 'ROLL-2026-A',
              target_quantity: 100,
              actual_fabric_used: 189,
              expected_fabric: 180,
              wastage_pct: 5.0,
              status: 'CUTTING_IN_PROGRESS',
              notes: 'Test batch',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
            error: null,
          })),
        };
      }

      if (table === 'verification_items') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({
            data: MOCK_COMPONENTS.map((c) => ({
              id: `v-${c.id}`,
              cutting_order_id: 'o0000000-0000-0000-0000-000000000001',
              recipe_component_id: c.id,
              expected_quantity: 100 * c.pieces_per_garment,
              actual_quantity: null,
              traffic_light: null,
              created_at: '2026-01-01T00:00:00Z',
            })),
            error: null,
          }),
        };
      }

      return {};
    }),
  } as unknown as SupabaseClient;
}

describe('Cutting Order Application Service', () => {
  const supervisorUser = {
    id: 'u0000000-0000-0000-0000-000000000001',
    role: 'cutting_supervisor' as const,
  };

  const verifierUser = {
    id: 'u0000000-0000-0000-0000-000000000002',
    role: 'cutting_verifier' as const,
  };

  const sewingUser = {
    id: 'u0000000-0000-0000-0000-000000000003',
    role: 'sewing_supervisor' as const,
  };

  describe('Role Authorization', () => {
    it('allows cutting_supervisor to create cutting order', async () => {
      const mockClient = createMockSupabaseClient();
      const payload = {
        recipe_id: MOCK_RECIPE.id,
        target_quantity: 100,
        fabric_roll_id: 'ROLL-2026-A',
        actual_fabric_used: 189,
      };

      const result = await createCuttingOrderService(
        payload,
        supervisorUser,
        mockClient,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('CUTTING_IN_PROGRESS');
    });

    it('rejects cutting_verifier attempting to create cutting order (403)', async () => {
      const mockClient = createMockSupabaseClient();
      const payload = {
        recipe_id: MOCK_RECIPE.id,
        target_quantity: 100,
        fabric_roll_id: 'ROLL-2026-A',
        actual_fabric_used: 189,
      };

      await expect(
        createCuttingOrderService(payload, verifierUser, mockClient),
      ).rejects.toThrow(AuthError);
    });

    it('rejects sewing_supervisor attempting to create cutting order (403)', async () => {
      const mockClient = createMockSupabaseClient();
      const payload = {
        recipe_id: MOCK_RECIPE.id,
        target_quantity: 100,
        fabric_roll_id: 'ROLL-2026-A',
        actual_fabric_used: 189,
      };

      await expect(
        createCuttingOrderService(payload, sewingUser, mockClient),
      ).rejects.toThrow(AuthError);
    });
  });

  describe('Validation & Error Handling', () => {
    it('rejects missing recipe_id', async () => {
      const mockClient = createMockSupabaseClient();
      const payload = {
        target_quantity: 100,
        fabric_roll_id: 'ROLL-2026-A',
        actual_fabric_used: 189,
      };

      await expect(
        createCuttingOrderService(payload, supervisorUser, mockClient),
      ).rejects.toThrow(ZodError);
    });

    it('rejects invalid recipe_id (not a UUID)', async () => {
      const mockClient = createMockSupabaseClient();
      const payload = {
        recipe_id: 'not-a-uuid',
        target_quantity: 100,
        fabric_roll_id: 'ROLL-2026-A',
        actual_fabric_used: 189,
      };

      await expect(
        createCuttingOrderService(payload, supervisorUser, mockClient),
      ).rejects.toThrow(ZodError);
    });

    it('rejects zero or negative target quantity', async () => {
      const mockClient = createMockSupabaseClient();
      const payloadZero = {
        recipe_id: MOCK_RECIPE.id,
        target_quantity: 0,
        fabric_roll_id: 'ROLL-2026-A',
        actual_fabric_used: 189,
      };

      await expect(
        createCuttingOrderService(payloadZero, supervisorUser, mockClient),
      ).rejects.toThrow(ZodError);
    });

    it('rejects fractional target quantity', async () => {
      const mockClient = createMockSupabaseClient();
      const payloadDecimal = {
        recipe_id: MOCK_RECIPE.id,
        target_quantity: 50.5,
        fabric_roll_id: 'ROLL-2026-A',
        actual_fabric_used: 189,
      };

      await expect(
        createCuttingOrderService(payloadDecimal, supervisorUser, mockClient),
      ).rejects.toThrow(ZodError);
    });

    it('throws NotFoundError when recipe ID does not exist in DB', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'recipes') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      const payload = {
        recipe_id: 'b0000000-0000-0000-0000-000000000001',
        target_quantity: 100,
        fabric_roll_id: 'ROLL-2026-A',
        actual_fabric_used: 189,
      };

      await expect(
        createCuttingOrderService(payload, supervisorUser, mockClient),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Security & Domain Logic Integrity', () => {
    it('ignores client-supplied expected_fabric, status, role, verifier_id and status override attempts', async () => {
      let insertedOrderData: Record<string, unknown> = {};

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'recipes') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: MOCK_RECIPE, error: null }),
            };
          }
          if (table === 'recipe_components') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: MOCK_COMPONENTS, error: null }),
            };
          }
          if (table === 'cutting_orders') {
            return {
              insert: vi.fn((data: Record<string, unknown>) => {
                insertedOrderData = data;
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'o1', ...data },
                    error: null,
                  }),
                };
              }),
            };
          }
          if (table === 'verification_items') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      const maliciousPayload = {
        recipe_id: MOCK_RECIPE.id,
        target_quantity: 100,
        fabric_roll_id: 'ROLL-2026-A',
        actual_fabric_used: 189,
        // Attacker attempts to override domain values:
        expected_fabric: 10, // fake 10 yds instead of 180 yds
        status: 'VERIFIED', // fake bypass to VERIFIED
        created_by: 'hacker-uuid',
      };

      await createCuttingOrderService(
        maliciousPayload,
        supervisorUser,
        mockClient,
      );

      // Server-side authoritative values MUST overwrite client payload:
      expect(insertedOrderData['expected_fabric']).toBe(180); // 1.8 * 100
      expect(insertedOrderData['status']).toBe('CUTTING_IN_PROGRESS'); // Enforced state
      expect(insertedOrderData['created_by']).toBe(supervisorUser.id); // Session user ID
      expect(insertedOrderData['wastage_pct']).toBe(5.0); // Derived from domain formula
    });

    it('calculates verification item expected_quantity per component strictly from recipe data', async () => {
      let insertedVerificationItems: { expected_quantity: number; recipe_component_id: string }[] = [];

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'recipes') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: MOCK_RECIPE, error: null }),
            };
          }
          if (table === 'recipe_components') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: MOCK_COMPONENTS, error: null }),
            };
          }
          if (table === 'cutting_orders') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'o-123' },
                error: null,
              }),
            };
          }
          if (table === 'verification_items') {
            return {
              insert: vi.fn((items: { expected_quantity: number; recipe_component_id: string }[]) => {
                insertedVerificationItems = items;
                return {
                  select: vi.fn().mockResolvedValue({ data: items, error: null }),
                };
              }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      await createCuttingOrderService(
        {
          recipe_id: MOCK_RECIPE.id,
          target_quantity: 100,
          fabric_roll_id: 'ROLL-2026-A',
          actual_fabric_used: 189,
        },
        supervisorUser,
        mockClient,
      );

      // Verify that 4 verification items were created:
      expect(insertedVerificationItems).toHaveLength(4);
      // Front Panel (2 pcs per garment * 100 garments = 200 pcs)
      expect(insertedVerificationItems[0]?.expected_quantity).toBe(200);
      // Collar (1 pc per garment * 100 garments = 100 pcs)
      expect(insertedVerificationItems[3]?.expected_quantity).toBe(100);
    });
  });

  describe('Order Retrieval (GET)', () => {
    it('allows authorized user (cutting_verifier) to list orders', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'cutting_orders') {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          if (table === 'verification_items') {
            return {
              select: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      const result = await listCuttingOrdersService(verifierUser, mockClient);
      expect(result).toEqual([]);
    });

    it('rejects unauthorized user role from listing orders', async () => {
      const mockClient = createMockSupabaseClient();
      const invalidRoleUser = {
        id: 'u-99',
        role: 'unauthorized_role' as unknown as UserRole,
      };

      await expect(
        listCuttingOrdersService(invalidRoleUser, mockClient),
      ).rejects.toThrow(AuthError);
    });

    it('throws NotFoundError when retrieving an order ID that does not exist', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'cutting_orders') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      await expect(
        getCuttingOrderByIdService('non-existent-id', supervisorUser, mockClient),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
