/**
 * API: GET /api/auth/me
 *
 * Returns the currently authenticated user's profile (id, email, role, full_name).
 * Used by client components that need to display session information without
 * an additional DB round-trip.
 *
 * Returns:
 *   200  { data: AuthenticatedUser }   — authenticated
 *   401  { error: string }             — not authenticated
 */

import { NextResponse } from 'next/server';
import { getServerUser } from '@/src/auth/getServerSession';

export async function GET() {
  const user = await getServerUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.json({ data: user }, { status: 200 });
}
