/**
 * API Route: /api/cutting-orders/[id]/verification/items
 *
 * POST /api/cutting-orders/[id]/verification/items — Verifier submits component count
 */

import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireRole } from '@/src/auth/requireRole';
import { AuthError } from '@/src/auth/roles';
import { getMutationSupabaseClient } from '@/src/db/supabaseClient';
import { recordComponentCountService } from '@/src/services/verificationService';
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

    const updatedItem = await recordComponentCountService(
      body,
      orderId,
      { id: user.id, role: user.role },
      supabase,
    );

    return NextResponse.json({ data: updatedItem }, { status: 200 });
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

    console.error('Unhandled API Error in POST verification items count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
