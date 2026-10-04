/**
 * Auth: Server-side session resolver.
 *
 * Extracts the authenticated user and their application role
 * from the server-side Supabase session.
 *
 * SECURITY RULES:
 *   1. Always call supabase.auth.getUser() — not getSession().
 *      getSession() reads from the cookie without re-validating
 *      the JWT against the Supabase server. getUser() validates
 *      the JWT server-side on every call.
 *   2. Role is always loaded from public.users by the verified
 *      auth.users.id — never from request headers, body, or
 *      query parameters.
 *   3. Never trust user ID, role, or verifier ID supplied by
 *      the client request.
 */

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/src/db/supabaseClient';
import type { User } from '@/src/types';
import { parseRole } from '@/src/auth/roles';

export type AuthenticatedUser = Pick<User, 'id' | 'email' | 'role' | 'full_name'>;

/**
 * Resolves the currently authenticated user from the server session.
 *
 * @returns The authenticated user with application role, or null if
 *          not authenticated.
 *
 * NEVER use the returned user.id for anything other than display
 * before calling requireRole(). Use requireRole() in protected
 * routes to guarantee role is enforced.
 */
export async function getServerUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createServerSupabaseClient();

    // getUser() validates the JWT against the Supabase Auth server.
    // This is the only safe way to verify identity server-side.
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    // Load the application role from public.users.
    // The admin client is used to bypass RLS for profile reads —
    // the user ID comes from the validated JWT, not from the client.
    const admin = createAdminSupabaseClient();
    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      // Auth user exists but has no profile — treat as unauthenticated.
      return null;
    }

    const role = parseRole(profile.role);
    if (!role) {
      // Invalid role stored in DB — treat as unauthenticated.
      console.error(`Invalid role in public.users for user ${authUser.id}: ${profile.role}`);
      return null;
    }

    return {
      id: profile.id as string,
      email: profile.email as string,
      role,
      full_name: profile.full_name as string,
    };
  } catch (err) {
    console.error('getServerUser error:', err);
    return null;
  }
}
