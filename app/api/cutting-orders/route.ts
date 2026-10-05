/**
 * API Route: /api/cutting-orders
 *
 * POST /api/cutting-orders — Creates a new cutting order (Cutting Supervisor only)
 * GET  /api/cutting-orders — Lists cutting orders (Authorized roles)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { requireRole } from '@/src/auth/requireRole';
import { AuthError } from '@/src/auth/roles';
import {
  getReadSupabaseClient,
  getMutationSupabaseClient,
} from '@/src/db/supabaseClient';
import {
  createCuttingOrderService,
  listCuttingOrdersService,
} from '@/src/services/cuttingOrderService';
import { DomainError, NotFoundError } from '@/src/domain';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user & resolve session & role guard
    const user = await requireRole('cutting_supervisor');

    // 2. Parse JSON body
    const body = await request.json();

    // 3. Obtain mutation Supabase client (service role when available)
    const supabase = await getMutationSupabaseClient();

    // 4. Call Application Service
    const createdOrder = await createCuttingOrderService(
      body,
      { id: user.id, role: user.role },
      supabase,
    );

    return NextResponse.json({ data: createdOrder }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    // 1. Authenticate & resolve session & role guard
    const user = await requireRole(
      'cutting_supervisor',
      'cutting_verifier',
      'sewing_supervisor',
    );

    // 2. Obtain server Supabase client
    const supabase = await getReadSupabaseClient();

    // 3. Call Application Service
    const orders = await listCuttingOrdersService(
      { id: user.id, role: user.role },
      supabase,
    );

    return NextResponse.json({ data: orders }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.flatten().fieldErrors,
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

  console.error('Unhandled API Error in /api/cutting-orders:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 },
  );
}
