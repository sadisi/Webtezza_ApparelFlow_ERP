-- ============================================================
-- ApparelFlow ERP — Demo User Profiles
-- Migration 003: public.users rows for the 3 demo accounts.
-- 
-- IMPORTANT: Run AFTER the demo auth users are created via the
-- seed script (supabase/seed-auth-users.ts).
-- The UUIDs below must match the actual auth.users.id values.
-- The seed script will replace these placeholder UUIDs automatically.
-- ============================================================

-- These are placeholder inserts. The seed-auth-users.ts script
-- handles the correct UUID mapping automatically.
-- If running manually after creating auth users, replace the UUIDs
-- with the actual auth.users.id values from your Supabase dashboard.

-- INSERT INTO public.users (id, email, role, full_name) VALUES
--   ('<supervisor-auth-uid>', 'supervisor@apparelflow.dev', 'cutting_supervisor', 'Alex Supervisor'),
--   ('<verifier-auth-uid>',   'verifier@apparelflow.dev',  'cutting_verifier',   'Jordan Verifier'),
--   ('<sewing-auth-uid>',     'sewing@apparelflow.dev',    'sewing_supervisor',  'Morgan Sewing');
