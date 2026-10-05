/**
 * API Route: /api/cutting-orders/[id]/sewing/start
 *
 * POST /api/cutting-orders/[id]/sewing/start — Starts sewing production (VERIFIED -> SEWING_IN_PROGRESS)
 * Strictly restricted to sewing_supervisor role. State transition enforced server-side.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/src/auth/requireRole';
import { AuthError } from '@/src/auth/roles';
import { getMutationSupabaseClient } from '@/src/db/supabaseClient';
import { startSewingService } from '@/src/services/sewingQueueService';
import { DomainError, NotFoundError, InvalidStateTransitionError } from '@/src/domain';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
    const user = await requireRole('sewing_supervisor');

    const supabase = await getMutationSupabaseClient();
    const updatedOrder = await startSewingService(
      orderId,
      { id: user.id, role: user.role },
      supabase,
    );

    return NextResponse.json(
      {
        data: updatedOrder,
        message: 'Order successfully transitioned to SEWING_IN_PROGRESS.',
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    if (error instanceof InvalidStateTransitionError) {
      return NextResponse.json(
        { error: 'This order cannot be started for sewing in its current state.' },
        { status: 422 },
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error('Unhandled API Error in POST start sewing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
