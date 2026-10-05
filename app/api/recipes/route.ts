/**
 * API Route: /api/recipes
 *
 * GET /api/recipes — Lists all garment recipes with components for order creation selection
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/src/auth/requireRole';
import { AuthError } from '@/src/auth/roles';
import { createServerSupabaseClient } from '@/src/db/supabaseClient';
import { getAllRecipes } from '@/src/db/queries/recipes';

export async function GET() {
  try {
    await requireRole(
      'cutting_supervisor',
      'cutting_verifier',
      'sewing_supervisor',
    );

    const supabase = await createServerSupabaseClient();
    const recipes = await getAllRecipes(supabase);

    return NextResponse.json({ data: recipes }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error('Unhandled API Error in GET /api/recipes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
