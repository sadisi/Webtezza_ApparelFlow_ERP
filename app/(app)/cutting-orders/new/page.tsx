/**
 * Page: /cutting-orders/new
 *
 * Create Cutting Order page.
 * Server Component that enforces role check for cutting_supervisor before rendering form.
 */

export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/src/auth/requireRole';
import { OrderForm } from '@/components/cutting/OrderForm';

export default async function NewCuttingOrderPage() {
  // Enforce cutting_supervisor role on the server
  await requireRole('cutting_supervisor');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header & Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link
              href="/cutting-orders"
              className="hover:text-blue-400 transition-colors"
            >
              Cutting Orders
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">New Order</span>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Create Cutting Order
          </h1>
        </div>

        <Link
          href="/cutting-orders"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to List
        </Link>
      </div>

      {/* Render Order Form */}
      <OrderForm />
    </div>
  );
}
