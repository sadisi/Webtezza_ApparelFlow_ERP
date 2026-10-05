/**
 * API Route: /api/cutting-orders/[id]/verification/approve
 *
 * POST /api/cutting-orders/[id]/verification/approve — Approves verification batch and transitions order to VERIFIED
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/src/auth/requireRole';
import { AuthError } from '@/src/auth/roles';
import { getMutationSupabaseClient } from '@/src/db/supabaseClient';
import { approveVerificationService } from '@/src/services/verificationService';
import { DomainError, NotFoundError, VerificationGateError } from '@/src/domain';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
    const user = await requireRole('cutting_verifier');

    const supabase = await getMutationSupabaseClient();
    const result = await approveVerificationService(
      orderId,
      { id: user.id, role: user.role },
      supabase,
    );

    return NextResponse.json(
      {
        data: result,
        message: 'Order successfully verified and approved for sewing queue.',
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
    if (error instanceof VerificationGateError) {
      return NextResponse.json(
        {
          error: 'Verification Gate Approval Failed',
          reasons: error.reasons,
        },
        { status: 422 },
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error('Unhandled API Error in POST approve verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
