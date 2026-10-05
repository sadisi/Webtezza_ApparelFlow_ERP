/**
 * Page: /verification/[id]
 *
 * Verification Terminal page for a single cutting order.
 * Primary workspace for Cutting Verifiers to record actual component counts,
 * evaluate the server-side traffic light status, and execute approval or rejection.
 */

export const dynamic = 'force-dynamic';

import React from 'react';
import { VerificationTerminal } from '@/components/verification/VerificationTerminal';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VerificationTerminalPage({ params }: PageProps) {
  const { id } = await params;

  return <VerificationTerminal orderId={id} />;
}
