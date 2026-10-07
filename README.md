# ApparelFlow ERP

Full-stack production verification and sewing queue management system developed for the **Webtezza Software Engineering Intern Assessment**.

ApparelFlow ERP bridges the critical quality control gap between garment cutting and sewing operations. It ensures that garment cutting orders undergo physical piece-count verification, strict traffic light assessment, fabric wastage calculations, and server-enforced approval gating before batches are permitted into the sewing queue.

---

## Core Production Workflow

```text
Cutting Supervisor
       │
       ▼
Create Cutting Order (Recipe Selection, Target Quantity, Fabric Used)
       │
       ▼
Component Calculation (Server computes expected piece counts & fabric usage)
       │
       ▼
Submit for Verification (Order moves to PENDING_VERIFICATION state)
       │
       ▼
Cutting Verifier QC Terminal (Enters physical piece counts per component)
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
VERIFIED (Zero RED shortages)    REJECTED (Shortage or defective batch)
       │                                 │
       ▼                                 ▼
Sewing Queue (Isolated)           Audit Logged with mandatory reason
       │
       ▼
Sewing Supervisor (Starts sewing order)
```

---

## Implemented Features

* **Garment Recipe Management**: Master catalog defining garment styles (e.g., Casual Blouse, Crop Top), standard fabric consumption per unit, and allowable wastage caps.
* **Component Multiplier Engine**: Automatic server calculation of expected component piece counts (`target_quantity * pieces_per_garment`).
* **Fabric Consumption & Wastage Tracking**: Calculates fabric usage variances and wastage percentages, flagging orders exceeding recipe wastage caps.
* **Interactive QC Verification Terminal**: Verifiers enter physical component counts with real-time traffic light assessment (`GREEN` exact match, `YELLOW` surplus, `RED` shortage).
* **Server-Enforced Approval Hard-Stop**: Server API independently verifies component counts and hard-stops approval if any component has a `RED` shortage.
* **Mandatory Rejection Reasons**: Batch rejections require an explicit, audited explanation string.
* **Isolated Sewing Queue**: Real-time queue displaying only verified orders eligible for sewing production.
* **3-Tier Role-Based Access Control (RBAC)**: Strict role separation for Cutting Supervisors, Cutting Verifiers, and Sewing Supervisors.
* **Immutable Audit Trail**: Permanent logging of all verification decisions in `verification_logs` capturing verifier identity, timestamp, decision, wastage, and item snapshot.
* **Comprehensive Automated Test Suite**: 16 test files passing 232 tests covering unit logic, API security, RBAC enforcement, state machine transitions, and E2E journeys.

---

## Technology Stack

* **Framework**: [Next.js 16.3.8](https://nextjs.org/) (App Router, Turbopack)
* **Frontend**: [React 19.2.8](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Radix UI Primitives](https://www.radix-ui.com/)
* **Language**: [TypeScript 5](https://www.typescriptlang.org/)
* **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 15+, `@supabase/supabase-js` `v2.49.0`, `@supabase/ssr` `v0.6.0`)
* **Validation**: [Zod 3.24.0](https://zod.dev/)
* **Testing**: [Vitest 3.1.0](https://vitest.dev/), [Playwright 1.50.0](https://playwright.dev/), `@testing-library/react` `v16.3.0`
* **Script Execution**: `tsx` `v4.23.15`

---

## User Roles & Permission Matrix

ApparelFlow ERP enforces 3 distinct operational roles:

1. **Cutting Supervisor (`cutting_supervisor`)**: Responsible for initiating garment cutting orders, entering fabric roll data, and submitting batches for quality verification.
2. **Cutting Verifier (`cutting_verifier`)**: Quality control verifier who inspects physical piece counts in the verification terminal, verifies item component totals, and approves or rejects batches.
3. **Sewing Supervisor (`sewing_supervisor`)**: Production line supervisor who monitors the isolated sewing queue and initiates sewing assembly on verified batches.

| Capability | Cutting Supervisor | Cutting Verifier | Sewing Supervisor |
| :--- | :---: | :---: | :---: |
| **Create cutting orders** | ✅ Allowed | ❌ Denied (403) | ❌ Denied (403) |
| **Submit orders for verification** | ✅ Allowed | ❌ Denied (403) | ❌ Denied (403) |
| **View verification terminal** | ❌ Denied (403) | ✅ Allowed | ❌ Denied (403) |
| **Verify batches (Count items)** | ❌ Denied (403) | ✅ Allowed | ❌ Denied (403) |
| **Approve / Reject batches** | ❌ Denied (403) | ✅ Allowed | ❌ Denied (403) |
| **View sewing queue** | ❌ Denied (403) | ❌ Denied (403) | ✅ Allowed |
| **Start sewing** | ❌ Denied (403) | ❌ Denied (403) | ✅ Allowed |

---

## Core Business Rules

1. **Component Multiplier**: Expected component quantity is calculated on the server: `expected_quantity = target_quantity * pieces_per_garment`.
2. **Expected Fabric Calculation**: Standard required fabric is calculated on the server: `expected_fabric = target_quantity * standard_fabric_yards`.
3. **Fabric Wastage Calculation**: Fabric wastage percentage is computed as `((actual_fabric - expected_fabric) / expected_fabric) * 100`. If `wastage_pct > wastage_cap_pct`, the order is flagged.
4. **Traffic Light Assessment Rules**:
   * `GREEN`: `actual_quantity === expected_quantity` (Exact match)
   * `YELLOW`: `actual_quantity > expected_quantity` (Surplus — allowed, does not block approval)
   * `RED`: `actual_quantity < expected_quantity` (Shortage — STOPS approval)
5. **RED Shortage Hard-Stop**: Any component with a `RED` shortage physically prevents batch approval at both API and service tiers.
6. **Rejection Reason Requirement**: Batch rejection requires a mandatory non-empty text string explaining the rejection cause.
7. **Lifecycle State Transitions**: Orders follow a strict state machine: `CUTTING_IN_PROGRESS` → `PENDING_VERIFICATION` → `COUNT_QC` → `VERIFIED` / `REJECTED` → `SEWING_IN_PROGRESS`.
8. **Sewing Queue Isolation**: Sewing queue queries return ONLY orders with `status = 'VERIFIED'`.
9. **Immutable Audit Trail**: Approvals and rejections append immutable audit records to `verification_logs`.

---

## Project Documentation Directory (`docs/`)

Technical documentation and assessment reports are organized inside the `docs/` folder:

* [System Architecture](file:///d:/Jobs/tests/webtezza_test/ApparelFlow%20ERP/docs/ARCHITECTURE.md) (`docs/ARCHITECTURE.md`): Detailed multi-tier architecture, sequence diagrams, and layer responsibilities.
* [Database Schema](file:///d:/Jobs/tests/webtezza_test/ApparelFlow%20ERP/docs/DATABASE_SCHEMA.md) (`docs/DATABASE_SCHEMA.md`): Complete PostgreSQL schema, ERD, tables, columns, constraints, and RLS policies.
* [Security Specification](file:///d:/Jobs/tests/webtezza_test/ApparelFlow%20ERP/docs/SECURITY.md) (`docs/SECURITY.md`): Comprehensive security documentation, RBAC matrix, IDOR protection, and server-side verification gate.
* [Testing Strategy](file:///d:/Jobs/tests/webtezza_test/ApparelFlow%20ERP/docs/TESTING.md) (`docs/TESTING.md`): Vitest/Playwright test suite breakdown, 232 test results, and requirement coverage matrix.
* [Deployment Guide](file:///d:/Jobs/tests/webtezza_test/ApparelFlow%20ERP/docs/DEPLOYMENT.md) (`docs/DEPLOYMENT.md`): Production setup, database migration commands, and deployment prerequisites.
* [Assessment Checklist](file:///d:/Jobs/tests/webtezza_test/ApparelFlow%20ERP/docs/ASSESSMENT_CHECKLIST.md) (`docs/ASSESSMENT_CHECKLIST.md`): Webtezza assessment criteria compliance breakdown and status.
* [AI Optimization Report](file:///d:/Jobs/tests/webtezza_test/ApparelFlow%20ERP/docs/AI_OPTIMIZATION_REPORT.md) (`docs/AI_OPTIMIZATION_REPORT.md`): Human-led engineering model, ChatGPT & Gemini assistance, AI flaw analysis, and refactoring decisions.

---

## AI-Assisted Development Model

ApparelFlow ERP was developed using a **human-led engineering workflow** with AI assistance from **ChatGPT** and **Google Gemini**.

```text
Human Developer
      │
      ▼
Requirements & Engineering Decisions
      │
      ▼
ChatGPT / Gemini AI Assistance
      │
      ▼
Generated suggestions / code / analysis
      │
      ▼
Human Review & Validation
      │
      ▼
Refactoring / Correction
      │
      ▼
Automated Testing (232 Passing Tests)
      │
      ▼
Final Implementation
```

The human developer remained responsible for all architectural decisions, requirement interpretations, debugging, security enforcement, and final code acceptance. For a detailed breakdown of AI prompt engineering, AI code flaw examples, and human refactoring, see the [AI Optimization Report](file:///d:/Jobs/tests/webtezza_test/ApparelFlow%20ERP/docs/AI_OPTIMIZATION_REPORT.md).

---

## Local Setup & Installation

### Prerequisites
* Node.js v20+
* npm v10+

### Installation Steps

1. **Clone repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.local.example` to `.env.local` and populate your Supabase credentials:
   ```bash
   cp .env.local.example .env.local
   ```

3. **Seed Database Demo Users**:
   ```bash
   npm run db:seed
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

ApparelFlow ERP requires the following variables defined in `.env.local`:

```env
# Public Keys (safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxx

# Server-Side Only (NEVER expose with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxxxxxxxx
```

---

## Testing Commands

Run the automated test suite using `package.json` scripts:

```bash
# Run Vitest unit & integration test suite (232 passing tests)
npm test

# Run Vitest in watch mode
npm run test:watch

# Run test coverage report
npm run test:coverage

# Run Playwright end-to-end tests
npm run test:e2e

# Open Playwright UI mode
npm run test:e2e:ui

# Static TypeScript type check
npm run type-check

# ESLint code linting
npm run lint
```

---

## Deployed Application

https://apparelflow-erp-beta.vercel.app/login

---

## Demo Credentials

These accounts are provided for evaluation of the ApparelFlow ERP assessment.

| Role | Email | Password |
| :--- | :--- | :--- |
| Cutting Supervisor | supervisor@apparelflow.dev | Demo1234! |
| Cutting Verifier | verifier@apparelflow.dev | Demo1234! |
| Sewing Supervisor | sewing@apparelflow.dev | Demo1234! |

