'use client';

/**
 * Layout: App Shell
 *
 * Client Component wrapper that composes Sidebar + TopBar + main content area.
 * Manages mobile navigation drawer state for responsive viewports (320px - 430px).
 * Receives the already-resolved user from the parent server layout.
 */

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import type { UserRole } from '@/src/auth/roles';

interface AppShellProps {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        role={role}
        userName={userName}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main View Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          userName={userName}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

