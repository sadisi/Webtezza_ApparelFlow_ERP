/**
 * API: POST /api/auth/login
 *
 * Authenticates a user with email + password via Supabase Auth.
 * On success, the @supabase/ssr cookie-based client automatically
 * writes the session cookie via the setAll handler.
 *
 * Returns:
 *   200  { redirectTo: string }   — login succeeded
 *   401  { error: string }        — invalid credentials
 *   400  { error: string }        — missing/invalid body
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/src/db/supabaseClient';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    // Supabase returns "Invalid login credentials" for wrong email/password.
    // Do not leak whether the email exists.
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 },
    );
  }

  return NextResponse.json({ redirectTo: '/dashboard' }, { status: 200 });
}
