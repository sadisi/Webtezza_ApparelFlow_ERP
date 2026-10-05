/**
 * API: POST /api/auth/logout
 *
 * Signs the current user out of Supabase Auth.
 * The @supabase/ssr client clears the session cookie via setAll.
 *
 * Returns:
 *   200  { ok: true }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/src/db/supabaseClient';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true }, { status: 200 });
}
