/**
 * Root page (/)
 *
 * Redirects authenticated users to /dashboard.
 * Unauthenticated users are redirected to /login by the middleware.
 *
 * force-dynamic: this page reads cookies via getServerUser().
 */

export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerUser } from '@/src/auth/getServerSession';

export default async function RootPage() {
  const user = await getServerUser();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
