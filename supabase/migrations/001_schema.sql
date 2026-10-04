-- ============================================================
-- ApparelFlow ERP — Database Schema
-- Migration 001: Full schema with all tables, types, indexes
-- ============================================================

-- ─── Order Status Enum ──────────────────────────────────────
CREATE TYPE order_status AS ENUM (
  'CUTTING_IN_PROGRESS',
  'PENDING_VERIFICATION',
  'COUNT_QC',
  'VERIFIED',
  'REJECTED',
  'SEWING_IN_PROGRESS'
);

-- ─── Users Table ────────────────────────────────────────────
-- Extends Supabase auth.users with application-specific role.
-- id matches auth.users.id exactly.
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('cutting_supervisor', 'cutting_verifier', 'sewing_supervisor')),
  full_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Recipes Table ──────────────────────────────────────────
CREATE TABLE public.recipes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  code                  TEXT UNIQUE NOT NULL,
  category              TEXT NOT NULL,
  standard_fabric_yards NUMERIC(10, 4) NOT NULL CHECK (standard_fabric_yards > 0),
  wastage_cap_pct       NUMERIC(5, 2)  NOT NULL CHECK (wastage_cap_pct >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Recipe Components Table ────────────────────────────────
CREATE TABLE public.recipe_components (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id          UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  component_name     TEXT NOT NULL,
  pieces_per_garment INT  NOT NULL CHECK (pieces_per_garment > 0),
  sort_order         INT  NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recipe_id, component_name)
);

CREATE INDEX idx_recipe_components_recipe_id ON public.recipe_components(recipe_id);

-- ─── Cutting Orders Table ────────────────────────────────────
CREATE TABLE public.cutting_orders (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id          UUID         NOT NULL REFERENCES public.recipes(id),
  created_by         UUID         NOT NULL REFERENCES public.users(id),
  fabric_roll_id     TEXT         NOT NULL,
  target_quantity    INT          NOT NULL CHECK (target_quantity > 0),
  actual_fabric_used NUMERIC(10, 4) NOT NULL CHECK (actual_fabric_used > 0),
  expected_fabric    NUMERIC(10, 4) NOT NULL CHECK (expected_fabric > 0),
  wastage_pct        NUMERIC(7, 4),
  status             order_status NOT NULL DEFAULT 'CUTTING_IN_PROGRESS',
  notes              TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cutting_orders_status     ON public.cutting_orders(status);
CREATE INDEX idx_cutting_orders_created_by ON public.cutting_orders(created_by);
CREATE INDEX idx_cutting_orders_recipe_id  ON public.cutting_orders(recipe_id);

-- ─── Verification Items Table ────────────────────────────────
-- One row per component per cutting order.
-- expected_quantity is server-computed: target_quantity × pieces_per_garment.
-- actual_quantity is entered by the verifier (NULL = not yet counted).
-- variance is a generated column — cannot be client-manipulated.
CREATE TABLE public.verification_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_order_id    UUID NOT NULL REFERENCES public.cutting_orders(id) ON DELETE CASCADE,
  recipe_component_id UUID NOT NULL REFERENCES public.recipe_components(id),
  expected_quantity   INT  NOT NULL CHECK (expected_quantity > 0),
  actual_quantity     INT  CHECK (actual_quantity >= 0),
  variance            INT  GENERATED ALWAYS AS (actual_quantity - expected_quantity) STORED,
  traffic_light       TEXT CHECK (traffic_light IN ('GREEN', 'YELLOW', 'RED')),
  counted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cutting_order_id, recipe_component_id)
);

CREATE INDEX idx_verification_items_order_id ON public.verification_items(cutting_order_id);

-- ─── Verification Logs Table ─────────────────────────────────
-- Immutable audit trail. verifier_id and created_at are always
-- sourced from the authenticated server session — never from the
-- client request body.
CREATE TABLE public.verification_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_order_id   UUID NOT NULL REFERENCES public.cutting_orders(id),
  verifier_id        UUID NOT NULL REFERENCES public.users(id),
  decision           TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
  reason             TEXT,
  wastage_pct        NUMERIC(7, 4),
  component_snapshot JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_logs_order_id   ON public.verification_logs(cutting_order_id);
CREATE INDEX idx_verification_logs_verifier_id ON public.verification_logs(verifier_id);

-- ─── updated_at Trigger ──────────────────────────────────────
-- Automatically updates updated_at on any row change.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cutting_orders_updated_at
  BEFORE UPDATE ON public.cutting_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_verification_items_updated_at
  BEFORE UPDATE ON public.verification_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Row Level Security ──────────────────────────────────────
-- Enable RLS on all tables.
-- Application uses the service role key server-side, which bypasses RLS.
-- This provides defence-in-depth for any accidental direct client access.
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_components  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs  ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read recipes and components (needed for order creation form)
CREATE POLICY "Authenticated users can read recipes"
  ON public.recipes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read recipe components"
  ON public.recipe_components FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- All other access goes through the service role (server-side only).
-- No client-side insert/update/delete is permitted via RLS.
