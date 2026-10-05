/**
 * Dashboard Page — /dashboard
 *
 * Server Component. Renders a role-specific landing view.
 *
 * dynamic = 'force-dynamic' is required because this page reads
 * session cookies via getServerUser(). Without it Next.js attempts
 * static pre-rendering and throws DYNAMIC_SERVER_USAGE.
 */

export const dynamic = 'force-dynamic';

/**
 *
 * What it shows per role:
 *   cutting_supervisor  → link to Cutting Orders + quick stats placeholder
 *   cutting_verifier    → link to Verification Terminal + pending count
 *   sewing_supervisor   → link to Sewing Queue
 *
 * This is an application shell page, NOT the full feature page.
 * The detailed feature pages are implemented in subsequent phases.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/src/auth/getServerSession';
import { ROLE_PERMISSIONS } from '@/src/auth/roles';
import {
  Scissors,
  ClipboardList,
  ShieldCheck,
  Shirt,
  ArrowRight,
  UserCheck,
  Building2,
  Cpu,
} from 'lucide-react';

// ─── Role-specific content definitions ───────────────────────────────────────

const ROLE_WELCOME: Record<string, { heading: string; sub: string }> = {
  cutting_supervisor: {
    heading: 'Cutting Supervisor',
    sub: 'Manage cutting orders and submit batches for verification.',
  },
  cutting_verifier: {
    heading: 'Cutting Verifier',
    sub: 'Count components and apply the verification gate before sewing.',
  },
  sewing_supervisor: {
    heading: 'Sewing Supervisor',
    sub: 'Manage the verified-only sewing queue.',
  },
};

// ─── Quick-action cards ───────────────────────────────────────────────────────

interface ActionCard {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: React.ReactNode;
  accentClass: string;
}

function buildActionCards(role: string): ActionCard[] {
  const perms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  const cards: ActionCard[] = [];

  if (perms?.canCreateOrder) {
    cards.push({
      title: 'Create Cutting Order',
      description: 'Start a new garment cutting batch from a recipe.',
      href: '/cutting-orders/new',
      cta: 'New order',
      icon: <Scissors className="h-5 w-5 text-amber-400" />,
      accentClass: 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5',
    });
  }

  if (perms?.canViewOwnOrders) {
    cards.push({
      title: 'My Cutting Orders',
      description: 'View and manage your active cutting orders.',
      href: '/cutting-orders',
      cta: 'View orders',
      icon: <ClipboardList className="h-5 w-5 text-amber-400" />,
      accentClass: 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5',
    });
  }

  if (perms?.canAccessVerification) {
    cards.push({
      title: 'Verification Terminal',
      description: 'Count components and apply the hard-stop approval gate.',
      href: '/verification',
      cta: 'Open terminal',
      icon: <ShieldCheck className="h-5 w-5 text-blue-400" />,
      accentClass: 'border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5',
    });
  }

  if (perms?.canAccessSewingQueue) {
    cards.push({
      title: 'Sewing Queue',
      description: 'View and start verified batches in the sewing queue.',
      href: '/sewing',
      cta: 'Open queue',
      icon: <Shirt className="h-5 w-5 text-emerald-400" />,
      accentClass: 'border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5',
    });
  }

  return cards;
}

// ─── System status strip ──────────────────────────────────────────────────────

function StatusItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon && <div className="p-1.5 rounded-md bg-slate-800 text-slate-400">{icon}</div>}
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-semibold text-slate-200">{value}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  const welcome = ROLE_WELCOME[user.role] ?? { heading: user.role, sub: '' };
  const actionCards = buildActionCards(user.role);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Greeting Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xs">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Good day, {user.full_name?.split(' ')[0] ?? 'there'}
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          {welcome.sub}
        </p>
      </div>

      {/* Role context strip */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <StatusItem label="Assigned Role" value={welcome.heading} icon={<UserCheck className="w-4 h-4" />} />
          <StatusItem label="Account Email" value={user.email} icon={<Building2 className="w-4 h-4" />} />
          <StatusItem label="System Version" value="ApparelFlow ERP v1.0" icon={<Cpu className="w-4 h-4" />} />
        </div>
      </div>

      {/* Action cards */}
      {actionCards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Role Operations &amp; Workflows
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {actionCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={`
                  group block rounded-xl border bg-slate-900 p-5
                  transition-all duration-150 shadow-xs ${card.accentClass}
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    {card.icon}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                    {card.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-100 group-hover:text-white mb-1">
                  {card.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
