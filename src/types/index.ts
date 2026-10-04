/**
 * Shared TypeScript types for ApparelFlow ERP.
 * Populated in Phase 2 (database & auth) and Phase 3 (domain layer).
 */

// ─── Order Status ────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'CUTTING_IN_PROGRESS'
  | 'PENDING_VERIFICATION'
  | 'COUNT_QC'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SEWING_IN_PROGRESS';

// ─── User Roles ──────────────────────────────────────────────────────────────

export type UserRole =
  | 'cutting_supervisor'
  | 'cutting_verifier'
  | 'sewing_supervisor';

// ─── Traffic Light ───────────────────────────────────────────────────────────

export type TrafficLight = 'GREEN' | 'YELLOW' | 'RED';

// ─── Verification Decision ───────────────────────────────────────────────────

export type VerificationDecision = 'APPROVED' | 'REJECTED';

// ─── Domain Entity Interfaces ────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  code: string;
  category: string;
  standard_fabric_yards: number;
  wastage_cap_pct: number;
  created_at: string;
}

export interface RecipeComponent {
  id: string;
  recipe_id: string;
  component_name: string;
  pieces_per_garment: number;
  sort_order: number;
  created_at: string;
}

export interface CuttingOrder {
  id: string;
  recipe_id: string;
  created_by: string;
  fabric_roll_id: string;
  target_quantity: number;
  actual_fabric_used: number;
  expected_fabric: number;
  wastage_pct: number | null;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationItem {
  id: string;
  cutting_order_id: string;
  recipe_component_id: string;
  expected_quantity: number;
  actual_quantity: number | null;
  variance: number | null;
  traffic_light: TrafficLight | null;
  counted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationLog {
  id: string;
  cutting_order_id: string;
  verifier_id: string;
  decision: VerificationDecision;
  reason: string | null;
  wastage_pct: number | null;
  component_snapshot: unknown;
  created_at: string;
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}
