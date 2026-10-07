# ApparelFlow ERP Database Schema

## Overview

The database for ApparelFlow ERP is hosted on PostgreSQL (via Supabase). The schema enforces relational integrity using Primary Keys, Foreign Keys with cascading rules, check constraints, unique constraints, generated columns, triggers, and Row Level Security (RLS) policies.

---

## Entity Relationship Diagram (ERD)

```text
┌─────────────────────────┐         ┌───────────────────────────────┐
│       auth.users        │         │            recipes            │
└────────────┬────────────┘         └───────────────┬───────────────┘
             │ 1                                    │ 1
             │                                      │
             │ 1                                    │ *
┌────────────▼────────────┐         ┌───────────────▼───────────────┐
│      public.users       │         │       recipe_components       │
└────────────┬────────────┘         └───────────────┬───────────────┘
             │ 1                                    │ 1
             │                                      │
             │ *                                    │ *
┌────────────▼────────────┐         ┌───────────────▼───────────────┐
│     cutting_orders      │◄────────┤      verification_items       │
└────────────┬────────────┘ 1     * └───────────────────────────────┘
             │ 1
             │
             │ *
┌────────────▼────────────┐
│    verification_logs    │
└─────────────────────────┘
```

---

## Tables Specification

### 1. `public.users`
Extends `auth.users` with application-specific RBAC roles and display profiles.

* **Purpose**: Stores user profile information and RBAC roles mapped 1:1 to Supabase Authentication user records.
* **Columns**:
  * `id` (`UUID`, PK, REFERENCES `auth.users(id)` ON DELETE CASCADE): Unique user ID matching Auth identity.
  * `email` (`TEXT`, UNIQUE, NOT NULL): User email address.
  * `role` (`TEXT`, NOT NULL): User RBAC role. CHECK constraint: `role IN ('cutting_supervisor', 'cutting_verifier', 'sewing_supervisor')`.
  * `full_name` (`TEXT`, NOT NULL): Full display name.
  * `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Account creation timestamp.
  * `updated_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Last profile update timestamp.
* **RLS Policies**:
  * `Users can read own profile`: `FOR SELECT TO authenticated USING (auth.uid() = id)`

---

### 2. `public.recipes`
Stores garment recipe definitions and standard consumption baselines.

* **Purpose**: Master table defining garment styles, standard fabric consumption per unit, and allowed fabric wastage caps.
* **Columns**:
  * `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`): Recipe unique identifier.
  * `name` (`TEXT`, NOT NULL): Garment style name (e.g., "Casual Blouse").
  * `code` (`TEXT`, UNIQUE, NOT NULL): Garment style code (e.g., "REC-BL01").
  * `category` (`TEXT`, NOT NULL): Garment category classification (e.g., "Blouse", "Crop Top").
  * `standard_fabric_yards` (`NUMERIC(10, 4)`, NOT NULL): Standard fabric required per single garment. CHECK constraint: `standard_fabric_yards > 0`.
  * `wastage_cap_pct` (`NUMERIC(5, 2)`, NOT NULL): Maximum allowable fabric wastage percentage before flagging. CHECK constraint: `wastage_cap_pct >= 0`.
  * `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Record creation timestamp.
* **RLS Policies**:
  * `Authenticated users can read recipes`: `FOR SELECT TO authenticated USING (true)`

---

### 3. `public.recipe_components`
Defines required component breakdown per garment recipe.

* **Purpose**: Stores the individual cut panels/pieces required to assemble one unit of a garment recipe.
* **Columns**:
  * `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`): Component unique identifier.
  * `recipe_id` (`UUID`, NOT NULL, REFERENCES `public.recipes(id)` ON DELETE CASCADE): Parent recipe ID.
  * `component_name` (`TEXT`, NOT NULL): Name of cut panel (e.g., "Front Body Panel", "Sleeves").
  * `pieces_per_garment` (`INT`, NOT NULL): Required piece multiplier per garment unit. CHECK constraint: `pieces_per_garment > 0`.
  * `sort_order` (`INT`, NOT NULL, DEFAULT `0`): UI display ordering index.
  * `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Record creation timestamp.
* **Constraints & Indexes**:
  * `UNIQUE (recipe_id, component_name)`
  * `CREATE INDEX idx_recipe_components_recipe_id ON public.recipe_components(recipe_id);`
* **RLS Policies**:
  * `Authenticated users can read recipe components`: `FOR SELECT TO authenticated USING (true)`

---

### 4. `public.cutting_orders`
Tracks garment cutting production orders and lifecycle states.

* **Purpose**: Core entity representing a batch order created by a Cutting Supervisor.
* **Columns**:
  * `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`): Order unique identifier.
  * `recipe_id` (`UUID`, NOT NULL, REFERENCES `public.recipes(id)`): Recipe used for cutting calculation.
  * `created_by` (`UUID`, NOT NULL, REFERENCES `public.users(id)`): Cutting supervisor user ID.
  * `fabric_roll_id` (`TEXT`, NOT NULL): Identifier for the fabric roll used.
  * `target_quantity` (`INT`, NOT NULL): Target total garment units to produce. CHECK constraint: `target_quantity > 0`.
  * `actual_fabric_used` (`NUMERIC(10, 4)`, NOT NULL): Fabric consumed in yards. CHECK constraint: `actual_fabric_used > 0`.
  * `expected_fabric` (`NUMERIC(10, 4)`, NOT NULL): Standard calculated fabric (`target_quantity * standard_fabric_yards`). CHECK constraint: `expected_fabric > 0`.
  * `wastage_pct` (`NUMERIC(7, 4)`): Server-calculated fabric wastage percentage.
  * `status` (`order_status`, NOT NULL, DEFAULT `'CUTTING_IN_PROGRESS'`): Order state (`CUTTING_IN_PROGRESS`, `PENDING_VERIFICATION`, `COUNT_QC`, `VERIFIED`, `REJECTED`, `SEWING_IN_PROGRESS`).
  * `notes` (`TEXT`): Optional order notes.
  * `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Order creation timestamp.
  * `updated_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Order update timestamp (managed via trigger).
* **Constraints & Indexes**:
  * `CREATE INDEX idx_cutting_orders_status ON public.cutting_orders(status);`
  * `CREATE INDEX idx_cutting_orders_created_by ON public.cutting_orders(created_by);`
  * `CREATE INDEX idx_cutting_orders_recipe_id ON public.cutting_orders(recipe_id);`
* **RLS Policies**: Row Level Security enabled. Default-deny for direct client queries; API route handlers query via server client after `requireRole()` authentication and authorization.

---

### 5. `public.verification_items`
Tracks individual component physical counts and traffic light statuses.

* **Purpose**: Records physical piece count verification for each component in a cutting order.
* **Columns**:
  * `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`): Item unique identifier.
  * `cutting_order_id` (`UUID`, NOT NULL, REFERENCES `public.cutting_orders(id)` ON DELETE CASCADE): Parent cutting order.
  * `recipe_component_id` (`UUID`, NOT NULL, REFERENCES `public.recipe_components(id)`): Component definition.
  * `expected_quantity` (`INT`, NOT NULL): Server-calculated required piece count (`target_quantity * pieces_per_garment`). CHECK constraint: `expected_quantity > 0`.
  * `actual_quantity` (`INT`): Physical piece count entered by verifier. CHECK constraint: `actual_quantity >= 0`. `NULL` indicates uncounted.
  * `variance` (`INT`, GENERATED ALWAYS AS (`actual_quantity - expected_quantity`) STORED): Server-computed count difference.
  * `traffic_light` (`TEXT`): Evaluation result (`GREEN`, `YELLOW`, `RED`). CHECK constraint: `traffic_light IN ('GREEN', 'YELLOW', 'RED')`.
  * `counted_at` (`TIMESTAMPTZ`): Timestamp when physical count was entered.
  * `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Record creation timestamp.
  * `updated_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Record update timestamp.
* **Constraints & Indexes**:
  * `UNIQUE (cutting_order_id, recipe_component_id)`
  * `CREATE INDEX idx_verification_items_order_id ON public.verification_items(cutting_order_id);`
* **RLS Policies**: Row Level Security enabled. Default-deny for direct client access; queried via server client after API-tier RBAC authorization.

---

### 6. `public.verification_logs`
Audit logging table for QC verification approvals and rejections.

* **Purpose**: Stores audit log records of every QC verification decision. By application design, records are written append-only upon approval/rejection.
* **Columns**:
  * `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`): Log entry unique identifier.
  * `cutting_order_id` (`UUID`, NOT NULL, REFERENCES `public.cutting_orders(id)`): Associated cutting order.
  * `verifier_id` (`UUID`, NOT NULL, REFERENCES `public.users(id)`): Cutting verifier user ID.
  * `decision` (`TEXT`, NOT NULL): QC decision. CHECK constraint: `decision IN ('APPROVED', 'REJECTED')`.
  * `reason` (`TEXT`): Mandatory explanation if `decision = 'REJECTED'`.
  * `wastage_pct` (`NUMERIC(7, 4)`): Fabric wastage snapshot at verification.
  * `component_snapshot` (`JSONB`): Immutable JSON snapshot of component counts, variances, and traffic light statuses.
  * `created_at` (`TIMESTAMPTZ`, NOT NULL, DEFAULT `NOW()`): Timestamp of QC decision.
* **Constraints & Indexes**:
  * `CREATE INDEX idx_verification_logs_order_id ON public.verification_logs(cutting_order_id);`
  * `CREATE INDEX idx_verification_logs_verifier_id ON public.verification_logs(verifier_id);`
* **RLS Policies**: Row Level Security enabled. Default-deny for direct client access; populated server-side on verification actions.

---

## Custom Database Enums & Triggers

### Enum `order_status`
```sql
CREATE TYPE order_status AS ENUM (
  'CUTTING_IN_PROGRESS',
  'PENDING_VERIFICATION',
  'COUNT_QC',
  'VERIFIED',
  'REJECTED',
  'SEWING_IN_PROGRESS'
);
```

### Trigger `set_updated_at`
Automatically updates `updated_at` timestamps on update operations for `cutting_orders`, `verification_items`, and `users`.
