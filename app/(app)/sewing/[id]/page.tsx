/**
 * Page: /sewing/[id]
 *
 * Sewing Order Inspection & Production Start page.
 */

export const dynamic = 'force-dynamic';

import React from 'react';
import { SewingOrderDetail } from '@/components/sewing/SewingOrderDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SewingOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <SewingOrderDetail orderId={id} />;
}
