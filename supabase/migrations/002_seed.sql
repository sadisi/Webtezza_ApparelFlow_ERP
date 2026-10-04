-- ============================================================
-- ApparelFlow ERP — Seed Data
-- Migration 002: Recipes + recipe components
-- Demo users are created separately via the Supabase Admin API
-- (see supabase/seed-users.sql for the user profile inserts
--  that must run AFTER auth users are created).
-- ============================================================

-- ─── Recipe A: Casual Blouse ─────────────────────────────────
INSERT INTO public.recipes (id, name, code, category, standard_fabric_yards, wastage_cap_pct)
VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Casual Blouse',
  'REC-BL01',
  'Blouse',
  1.8000,
  5.00
);

INSERT INTO public.recipe_components (recipe_id, component_name, pieces_per_garment, sort_order)
VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Front Body Panel',  1, 1),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Back Body Panel',   1, 2),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Sleeves',           2, 3),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Collar & Stand',    1, 4),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Sleeve Cuffs',      2, 5);

-- ─── Recipe B: Crop Top ──────────────────────────────────────
INSERT INTO public.recipes (id, name, code, category, standard_fabric_yards, wastage_cap_pct)
VALUES (
  'b2c3d4e5-0002-0002-0002-000000000002',
  'Crop Top',
  'REC-CT02',
  'Crop Top',
  1.1000,
  8.00
);

INSERT INTO public.recipe_components (recipe_id, component_name, pieces_per_garment, sort_order)
VALUES
  ('b2c3d4e5-0002-0002-0002-000000000002', 'Front Chest Panel',   1, 1),
  ('b2c3d4e5-0002-0002-0002-000000000002', 'Back Support Panel',  1, 2),
  ('b2c3d4e5-0002-0002-0002-000000000002', 'Neck Binding Strip',  1, 3),
  ('b2c3d4e5-0002-0002-0002-000000000002', 'Hem Elastic Casing',  1, 4),
  ('b2c3d4e5-0002-0002-0002-000000000002', 'Side Strap Accents',  2, 5);

-- ─── Verification Query ──────────────────────────────────────
-- Run after migration to verify seed data:
-- SELECT r.code, r.name, rc.component_name, rc.pieces_per_garment
-- FROM public.recipes r
-- JOIN public.recipe_components rc ON rc.recipe_id = r.id
-- ORDER BY r.code, rc.sort_order;
