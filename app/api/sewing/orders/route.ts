/**
 * API Route: /api/sewing/orders
 *
 * GET /api/sewing/orders — Lists sewing queue orders (Sewing Supervisor only)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/src/auth/requireRole';
import { AuthError } from '@/src/auth/roles';
import { createServerSupabaseClient } from '@/src/db/supabaseClient';
import { getSewingQueueService } from '@/src/services/sewingQueueService';
import { SewingStatusFilter } from '@/src/db/queries/sewingQueue';
import { DomainError, NotFoundError } from '@/src/domain';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('sewing_supervisor');

    const searchParams = request.nextUrl.searchParams;
    const rawFilter = searchParams.get('status') as SewingStatusFilter | null;
    const statusFilter: SewingStatusFilter =
      rawFilter === 'VERIFIED' || rawFilter === 'SEWING_IN_PROGRESS'
        ? rawFilter
        : 'ALL';

    const supabase = await createServerSupabaseClient();
    const orders = await getSewingQueueService(
      { id: user.id, role: user.role },
      supabase,
      statusFilter,
    );

    return NextResponse.json({ data: orders }, { status: 200 });
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

    console.error('Unhandled API Error in GET /api/sewing/orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
