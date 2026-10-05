'use client';

/**
 * Login Page
 *
 * Authenticates users via /api/auth/login (Supabase email+password).
 * On success the server sets the session cookie and redirects to /dashboard.
 * On failure the form shows an inline error — credentials are never stored
 * in component state beyond the controlled form lifetime.
 *
 * SECURITY:
 *   - No fake/mock authentication.
 *   - No role selection UI (role is read from the DB, never from the client).
 *   - Credentials are only sent to /api/auth/login over HTTPS; they are not
 *     stored in localStorage, sessionStorage, or React state after submit.
 *
 * NOTE: useSearchParams() is used inside <LoginForm> which is wrapped in
 * <Suspense> here to satisfy Next.js build requirements for static pages.
 */

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ─── Inner form (reads search params) ────────────────────────────────────────

function getSafeRedirectUrl(param: string | null): string {
  if (!param) return '/dashboard';
  const trimmed = param.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('://') &&
    !trimmed.includes('\\')
  ) {
    return trimmed;
  }
  return '/dashboard';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirectUrl(searchParams.get('redirectTo'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Login failed. Please try again.');
        return;
      }

      // Session cookie is now set by the API route.
      // Redirect to the originally requested page (or dashboard).
      router.push(redirectTo);
      router.refresh(); // flush Next.js RSC cache so new session is visible
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <h2 className="text-sm font-semibold text-slate-200 mb-5">
        Sign in to your account
      </h2>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Error alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-red-950/60 border border-red-800/80 px-3.5 py-3 text-xs text-red-200 shadow-xs"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
          >
            Email address <span className="text-red-400">*</span>
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="you@company.com"
            className="
              w-full rounded-lg bg-slate-950 border border-slate-700
              px-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150 shadow-xs
            "
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
          >
            Password <span className="text-red-400">*</span>
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className="
              w-full rounded-lg bg-slate-950 border border-slate-700
              px-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150 shadow-xs
            "
          />
        </div>

        {/* Submit */}
        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="
            w-full rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700
            px-4 py-2.5 text-sm font-semibold text-white shadow-md
            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
          "
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin text-white"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in…
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 select-none">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-600/20">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            ApparelFlow ERP
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            Enterprise Production Control System
          </p>
        </div>

        {/*
          LoginForm uses useSearchParams() which requires a Suspense boundary
          when Next.js renders the page statically.
        */}
        <Suspense
          fallback={
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <div className="h-40 flex items-center justify-center">
                <svg className="h-5 w-5 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Demo credentials hint (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs text-slate-500">
            <p className="font-medium text-slate-400 mb-1.5">Demo accounts</p>
            <ul className="space-y-0.5">
              <li>supervisor@apparelflow.test</li>
              <li>verifier@apparelflow.test</li>
              <li>sewing@apparelflow.test</li>
              <li className="mt-1 text-slate-600">Password: Demo1234!</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
