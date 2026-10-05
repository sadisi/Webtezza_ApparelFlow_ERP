'use client';

/**
 * Layout: Sidebar Navigation
 *
 * Renders role-specific navigation links for the authenticated user.
 * Navigation visibility is driven by ROLE_PERMISSIONS — never by
 * client-supplied data.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Scissors,
  ShieldCheck,
  Shirt,
  Factory,
  X,
} from 'lucide-react';
import type { UserRole } from '@/src/auth/roles';
import { ROLE_PERMISSIONS } from '@/src/auth/roles';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  role: UserRole;
  userName: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const ROLE_LABEL: Record<UserRole, string> = {
  cutting_supervisor: 'Cutting Supervisor',
  cutting_verifier: 'Cutting Verifier',
  sewing_supervisor: 'Sewing Supervisor',
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  cutting_supervisor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cutting_verifier: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sewing_supervisor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function buildNavItems(role: UserRole): NavItem[] {
  const perms = ROLE_PERMISSIONS[role];
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  ];

  if (perms.canCreateOrder || perms.canViewOwnOrders) {
    items.push({ href: '/cutting-orders', label: 'Cutting Orders', icon: <Scissors className="h-4 w-4" /> });
  }
  if (perms.canAccessVerification) {
    items.push({ href: '/verification', label: 'Verification Terminal', icon: <ShieldCheck className="h-4 w-4" /> });
  }
  if (perms.canAccessSewingQueue) {
    items.push({ href: '/sewing', label: 'Sewing Queue', icon: <Shirt className="h-4 w-4" /> });
  }

  return items;
}

export function Sidebar({ role, userName, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const navItems = buildNavItems(role);

  // Close mobile navigation drawer on route change
  useEffect(() => {
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const sidebarContent = (
    <aside className="flex flex-col w-60 shrink-0 bg-slate-900 border-r border-slate-800 h-full">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white shadow-sm shrink-0">
            <Factory className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight leading-none">ApparelFlow</span>
            <span className="text-[10px] text-slate-400 font-medium leading-none mt-1">Enterprise ERP</span>
          </div>
        </Link>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150',
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={clsx('shrink-0', isActive ? 'text-blue-400' : 'text-slate-400')}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="px-3 py-3 border-t border-slate-800 shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold shrink-0 shadow-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-200 truncate">{userName}</p>
            <span
              className={clsx(
                'inline-block text-[10px] font-medium px-2 py-0.5 rounded border mt-0.5',
                ROLE_BADGE_CLASS[role],
              )}
            >
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar (persistent) */}
      <div className="hidden md:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer content */}
          <div className="relative z-10 w-60 max-w-[80vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

