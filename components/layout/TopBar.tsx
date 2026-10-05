'use client';

/**
 * Layout: Top Bar
 *
 * Displays page context (title derived from pathname), mobile menu toggle, and a logout button.
 * Logout calls POST /api/auth/logout then redirects to /login.
 */

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { clsx } from 'clsx';
import { Menu, LogOut } from 'lucide-react';

interface TopBarProps {
  userName: string;
  onToggleMobileMenu?: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cutting-orders': 'Cutting Orders Queue',
  '/cutting-orders/new': 'New Cutting Order',
  '/verification': 'Verification Terminal Queue',
  '/sewing': 'Sewing Queue',
  '/sewing-queue': 'Sewing Queue',
};

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (/^\/cutting-orders\/[^/]+$/.test(pathname)) return 'Cutting Order Details';
  if (/^\/cutting-orders\/[^/]+\/verify$/.test(pathname)) return 'Verify Order Batch';
  if (/^\/verification\/[^/]+$/.test(pathname)) return 'Verification Terminal';
  if (/^\/sewing\/[^/]+$/.test(pathname)) return 'Sewing Order Inspection';
  return 'ApparelFlow ERP';
}

export function TopBar({ userName, onToggleMobileMenu }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const title = resolveTitle(pathname);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="flex items-center justify-between h-14 px-4 sm:px-6 bg-slate-950 border-b border-slate-800 shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile drawer toggle */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle navigation menu"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <h1 className="text-sm font-semibold text-slate-100 truncate tracking-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className="hidden sm:inline-block text-xs font-medium text-slate-400 truncate max-w-[180px]"
          title={`Logged in as ${userName}`}
        >
          {userName}
        </span>

        <button
          id="logout-button"
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out of your session"
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5',
            'text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-950',
            'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs',
          )}
          aria-label="Sign out"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden xs:inline">{loggingOut ? 'Signing out…' : 'Sign out'}</span>
        </button>
      </div>
    </header>
  );
}

