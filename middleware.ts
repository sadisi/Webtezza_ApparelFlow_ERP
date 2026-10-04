/**
 * Next.js Middleware — Session refresh and route protection.
 *
 * Responsibilities:
 *   1. Refreshes the Supabase session cookie on every request
 *      (required by @supabase/ssr to keep sessions alive).
 *   2. Redirects unauthenticated users to /login for protected routes.
 *
 * IMPORTANT: This middleware does NOT enforce role-based access.
 * Role enforcement happens inside each API route and Server Action
 * via requireRole(). Middleware-only role checks are NOT security.
 *
 * Protected route pattern: /(app)/* and /api/* (except /api/auth/*)
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that do NOT require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';
  const supabaseAnonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ??
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ??
    '';

  // Create a Supabase client that can read and refresh session cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]),
        );
      },
    },
  });

  // IMPORTANT: getUser() validates the JWT server-side.
  // This is required before every session-dependent operation.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public routes unconditionally
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Redirect unauthenticated users to /login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated — allow through.
  // Role enforcement is handled in each API route via requireRole().
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   - _next/static (static files)
     *   - _next/image (image optimization)
     *   - favicon.ico, public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
