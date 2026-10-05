/**
 * API Route: /api/cutting-orders/[id]
 *
 * GET /api/cutting-orders/[id] — Retrieves details for a specific cutting order
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/src/auth/requireRole';
import { AuthError } from '@/src/auth/roles';
import { getReadSupabaseClient } from '@/src/db/supabaseClient';
import { getCuttingOrderByIdService } from '@/src/services/cuttingOrderService';
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
    const order = await getCuttingOrderByIdService(
      id,
      { id: user.id, role: user.role },
      supabase,
    );

    return NextResponse.json({ data: order }, { status: 200 });
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

    console.error('Unhandled API Error in GET /api/cutting-orders/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
