/**
 * ApparelFlow ERP — Auth User Seeder
 *
 * Creates the 3 demo Supabase Auth accounts and their matching
 * public.users profile rows.
 *
 * Run with:
 *   npx tsx supabase/seed-auth-users.ts
 *
 * Requires .env.local to have:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const result = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(result)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Admin client — uses service role key, bypasses RLS
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_USERS = [
  {
    email: 'supervisor@apparelflow.dev',
    password: 'Demo1234!',
    role: 'cutting_supervisor' as const,
    full_name: 'Alex Supervisor',
  },
  {
    email: 'verifier@apparelflow.dev',
    password: 'Demo1234!',
    role: 'cutting_verifier' as const,
    full_name: 'Jordan Verifier',
  },
  {
    email: 'sewing@apparelflow.dev',
    password: 'Demo1234!',
    role: 'sewing_supervisor' as const,
    full_name: 'Morgan Sewing',
  },
] as const;

async function seedUsers() {
  console.log('🌱 Starting demo user seed...\n');

  for (const user of DEMO_USERS) {
    console.log(`Processing: ${user.email} (${user.role})`);

    // 1. Check if auth user already exists
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existing = existingList?.users?.find((u) => u.email === user.email);

    let authUserId: string;

    if (existing) {
      console.log(`  ✓ Auth user already exists: ${existing.id}`);
      authUserId = existing.id;
    } else {
      // 2. Create auth user via admin API
      const { data: created, error: createError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Skip email confirmation for demo
        });

      if (createError || !created?.user) {
        console.error(`  ❌ Failed to create auth user: ${createError?.message}`);
        process.exit(1);
      }

      authUserId = created.user.id;
      console.log(`  ✓ Created auth user: ${authUserId}`);
    }

    // 3. Upsert public.users profile
    const { error: profileError } = await supabase
      .from('users')
      .upsert(
        {
          id: authUserId,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error(`  ❌ Failed to upsert profile: ${profileError.message}`);
      process.exit(1);
    }

    console.log(`  ✓ Profile upserted with role: ${user.role}\n`);
  }

  // 4. Verify
  console.log('🔍 Verifying seed...\n');
  const { data: profiles, error: verifyError } = await supabase
    .from('users')
    .select('email, role, full_name')
    .order('role');

  if (verifyError) {
    console.error('❌ Verification query failed:', verifyError.message);
    process.exit(1);
  }

  console.log('public.users rows:');
  console.table(profiles);

  console.log('\n✅ Demo user seed complete.\n');
  console.log('Demo Credentials:');
  console.log('  supervisor@apparelflow.dev  | Demo1234! | cutting_supervisor');
  console.log('  verifier@apparelflow.dev    | Demo1234! | cutting_verifier');
  console.log('  sewing@apparelflow.dev      | Demo1234! | sewing_supervisor');
}

seedUsers().catch((err: unknown) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
