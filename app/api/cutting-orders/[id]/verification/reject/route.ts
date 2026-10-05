/**
 * API Route: /api/cutting-orders/[id]/verification/reject
 *
 * POST /api/cutting-orders/[id]/verification/reject — Rejects verification batch with mandatory reason
 */

import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireRole } from '@/src/auth/requireRole';
import { AuthError } from '@/src/auth/roles';
import { getMutationSupabaseClient } from '@/src/db/supabaseClient';
import { rejectVerificationService } from '@/src/services/verificationService';
import { DomainError, NotFoundError } from '@/src/domain';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
    const user = await requireRole('cutting_verifier');

    const body = await request.json();
    const supabase = await getMutationSupabaseClient();

    const result = await rejectVerificationService(
      body,
      orderId,
      { id: user.id, role: user.role },
      supabase,
    );

    return NextResponse.json(
      {
        data: result,
        message: 'Order verification rejected.',
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 422 },
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error('Unhandled API Error in POST reject verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
