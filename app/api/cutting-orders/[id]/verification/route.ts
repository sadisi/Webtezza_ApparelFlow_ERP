/**
 * API Route: /api/cutting-orders/[id]/verification
 *
 * GET /api/cutting-orders/[id]/verification — Returns verification terminal data with server-calculated traffic lights
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/src/auth/requireRole';
import { AuthError } from '@/src/auth/roles';
import { getReadSupabaseClient } from '@/src/db/supabaseClient';
import { getVerificationTerminalService } from '@/src/services/verificationService';
import { DomainError, NotFoundError } from '@/src/domain';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireRole(
      'cutting_supervisor',
      'cutting_verifier',
      'sewing_supervisor',
    );

    const supabase = await getReadSupabaseClient();
    const result = await getVerificationTerminalService(
      id,
      { id: user.id, role: user.role },
      supabase,
    );

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error('Unhandled API Error in GET verification terminal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
