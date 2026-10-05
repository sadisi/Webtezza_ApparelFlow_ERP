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
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5 ring-1 ring-white/5">
      <div className="border-b border-slate-800/80 pb-3">
        <h2 className="text-base font-bold text-slate-100 tracking-tight">
          Sign in to your account
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Select role credentials or enter your system account.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Error alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-red-950/70 border border-red-800/80 px-4 py-3 text-xs text-red-200 shadow-sm"
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
            className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider"
          >
            Email address <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
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
                w-full rounded-xl bg-slate-950/80 border border-slate-700/80
                pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150 shadow-inner
              "
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider"
          >
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
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
                w-full rounded-xl bg-slate-950/80 border border-slate-700/80
                pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150 shadow-inner
              "
            />
          </div>
        </div>

        {/* Submit */}
        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="
            w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700
            px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25
            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150 mt-2
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
            'Sign in to System'
          )}
        </button>
      </form>

      {/* Development Quick Fill Options */}
      {process.env.NODE_ENV === 'development' && (
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Fill Demo Roles
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEmail('supervisor@apparelflow.test');
                setPassword('Demo1234!');
              }}
              className="px-2 py-1.5 text-[11px] font-medium bg-slate-800/70 hover:bg-blue-900/40 hover:text-blue-300 border border-slate-700/60 rounded-lg text-slate-300 transition-colors text-center truncate"
            >
              Cutting Sup.
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('verifier@apparelflow.test');
                setPassword('Demo1234!');
              }}
              className="px-2 py-1.5 text-[11px] font-medium bg-slate-800/70 hover:bg-emerald-900/40 hover:text-emerald-300 border border-slate-700/60 rounded-lg text-slate-300 transition-colors text-center truncate"
            >
              Verifier
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('sewing@apparelflow.test');
                setPassword('Demo1234!');
              }}
              className="px-2 py-1.5 text-[11px] font-medium bg-slate-800/70 hover:bg-purple-900/40 hover:text-purple-300 border border-slate-700/60 rounded-lg text-slate-300 transition-colors text-center truncate"
            >
              Sewing Sup.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white mb-2 shadow-xl shadow-blue-500/20 ring-1 ring-white/20">
            <svg
              className="w-7 h-7"
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            ApparelFlow ERP
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Enterprise Production Control System
          </p>
        </div>

        {/* LoginForm with Suspense */}
        <Suspense
          fallback={
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="h-48 flex items-center justify-center">
                <svg className="h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
