/**
 * Protected App Layout — app/(app)/layout.tsx
 *
 * This is a Server Component. It:
 *   1. Resolves the authenticated user via getServerUser() (JWT-validated).
 *   2. Redirects unauthenticated visitors to /login.
 *   3. Passes role and name to the AppShell.
 *
 * SECURITY:
 *   - Role comes from the DB profile loaded by getServerUser(), not from
 *     any client-supplied header, cookie value, or query parameter.
 *   - Individual API routes still call requireRole() — this layout redirect
 *     is UX-only, not a security gate.
 *
 * force-dynamic: reads session cookies on every request.
 */

export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerUser } from '@/src/auth/getServerSession';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell role={user.role} userName={user.full_name || user.email}>
      {children}
    </AppShell>
  );
}
