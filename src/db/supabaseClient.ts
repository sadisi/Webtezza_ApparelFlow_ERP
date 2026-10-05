/**
 * DB: Supabase client factory functions.
 *
 * Two clients:
 *   createServerSupabaseClient() — for API routes and Server Components.
 *     Uses cookie-based session via @supabase/ssr.
 *   createAdminSupabaseClient()  — uses service role key (server-side only).
 *     Bypasses RLS. Used only for privileged server operations.
 *
 * IMPORTANT: createAdminSupabaseClient() must NEVER be called from
 * client-side code or shared modules that can be bundled client-side.
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey =
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ??
  process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  );
}

/**
 * Creates a Supabase client that reads/writes the session cookie.
 * Use in API Route handlers and Server Components.
 * Returns a user session based on the request cookie — safe for RBAC.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
          });
        } catch {
          // In Server Components, cookie writes are no-ops.
          // The middleware handles session refresh.
        }
      },
    },
  });
}

/**
 * Creates an admin Supabase client using the service role key.
 * Bypasses Row Level Security.
 *
 * USE ONLY IN:
 *   - Server-side API routes
 *   - Seed scripts
 *   - Server Actions
 *
 * NEVER:
 *   - Use in client components
 *   - Pass to the browser
 *   - Export as NEXT_PUBLIC_*
 */
export function createAdminSupabaseClient() {
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY — this client must only be used server-side',
    );
  }

  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Helper to obtain the appropriate Supabase client for server-side database mutations.
 * When SUPABASE_SERVICE_ROLE_KEY is configured, returns the service-role client to bypass RLS
 * after server-side RBAC authorization has succeeded.
 * Otherwise, falls back to the server client.
 */
export async function getMutationSupabaseClient() {
  if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    return createAdminSupabaseClient();
  }
  return createServerSupabaseClient();
}

/**
 * Helper to obtain the appropriate Supabase client for server-side database reads.
 * When SUPABASE_SERVICE_ROLE_KEY is configured, returns the service-role client to bypass RLS.
 * Application-layer RBAC (requireRole) must always be called before using this client.
 * Otherwise, falls back to the standard cookie-based server client.
 */
export async function getReadSupabaseClient() {
  if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    return createAdminSupabaseClient();
  }
  return createServerSupabaseClient();
}

