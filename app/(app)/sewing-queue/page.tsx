/**
 * Redirect /sewing-queue to /sewing
 */

import { redirect } from 'next/navigation';

export default function SewingQueueRedirectPage() {
  redirect('/sewing');
}
