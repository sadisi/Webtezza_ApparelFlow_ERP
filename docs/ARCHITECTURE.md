# ApparelFlow ERP Architecture

## Architectural Overview

ApparelFlow ERP is designed as a multi-tier, server-authoritative garment production verification and queue management system built on Next.js 16 (App Router) and Supabase (PostgreSQL). The system strictly enforces garment cutting calculations, quality control (QC) verification gates, state-machine transitions, and role-based access control (RBAC) across all tiers.

```text
┌─────────────────────────────────────────────────────────┐
│                       Browser UI                        │
│             Next.js 16 App Router (React 19)            │
│           Tailwind CSS v4 & Radix UI Primitives         │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   Server / API Layer                    │
│      Next.js Route Handlers (app/api/*)                 │
│      Auth Session Resolution (getServerSession)        │
│      Role Enforcement Middleware (requireRole)          │
│      Zod Schema Input Validation                        │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 Domain & Service Layer                  │
│      State Machine Engine (validateStateTransition)     │
│      Traffic Light & Verification Gate Engine           │
│      Expected Quantity & Fabric Wastage Calculators     │
│      Cutting & Verification Services                    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase / PostgreSQL                   │
│      Relational Schema (users, recipes, orders, items) │
│      Row Level Security (RLS) Policies                  │
│      Append-Only Audit Trail (verification_logs)        │
└─────────────────────────────────────────────────────────┘
```

---

## Architectural Layers

### 1. Presentation Layer (`app/` & `components/`)
* **Technology**: Next.js 16 App Router, React 19, Tailwind CSS v4, Lucide React icons, Radix UI accessible primitives.
* **Responsibilities**: Displays order tables, metrics cards, verification terminal inputs, traffic light indicators, and sewing queue statuses.
* **Security & Isolation**: Client components render role-specific user interfaces based on authenticated session context. No domain math or authorization checks are trusted from client state.

### 2. Server / API Layer (`app/api/`)
* **Technology**: Next.js Route Handlers (`route.ts`).
* **Responsibilities**: Serves as the security boundary. Authenticates session cookies using `@supabase/ssr`, executes RBAC checks via `requireRole()`, validates incoming JSON payloads using Zod schemas (`src/validation/`), and returns standardized JSON HTTP responses with appropriate status codes (401, 403, 400, 404, 500).

### 3. Domain Layer (`src/domain/`)
* **Technology**: Pure, side-effect-free TypeScript functions.
* **Responsibilities**: Implements core business logic rules:
  * `componentQuantity.ts`: Calculates total expected component pieces (`target_quantity * pieces_per_garment`).
  * `wastage.ts`: Computes fabric wastage percentages (`(actual - expected) / expected * 100`) and validates against recipe wastage caps.
  * `trafficLight.ts`: Determines component status (`GREEN` for exact match, `YELLOW` for surplus, `RED` for shortage) and evaluates the production verification gate.
  * `stateMachine.ts`: Enforces strict lifecycle state transitions (`CUTTING_IN_PROGRESS` → `PENDING_VERIFICATION` → `COUNT_QC` → `VERIFIED` / `REJECTED` → `SEWING_IN_PROGRESS`).
  * `errors.ts`: Defines domain error types (`DomainError`, `StateTransitionError`, `VerificationGateError`, `WastageExceededError`).

### 4. Service Layer (`src/services/`)
* **Technology**: Application service modules.
* **Responsibilities**: Orchestrates domain logic with database queries:
  * `cuttingOrderService.ts`: Manages order creation, recipe verification, expected fabric calculation, and status updates.
  * `verificationService.ts`: Handles item count updates, evaluates verification gate status, records audit logs, and updates order states.
  * `sewingQueueService.ts`: Manages the isolated sewing queue (`VERIFIED` and `SEWING_IN_PROGRESS` statuses), allowing sewing supervisors to view and claim verified batches.

### 5. Database Layer (`src/db/` & `supabase/`)
* **Technology**: PostgreSQL managed by Supabase.
* **Responsibilities**: Maintains relational data integrity, Foreign Keys, CHECK constraints, and generated columns.
* **Access Control**: Database tables have Row Level Security (RLS) enabled. Server-side service operations use `getReadSupabaseClient()` and `getMutationSupabaseClient()` to interact with PostgreSQL using service-role authorization after API-tier RBAC verification.

---

## Data Flow & Lifecycle Sequence

```text
Cutting Supervisor          Verifier QC            Sewing Supervisor
       │                        │                          │
       │ 1. Create Order        │                          │
       ├───────────────────────►│                          │
       │ (CUTTING_IN_PROGRESS)  │                          │
       │                        │                          │
       │ 2. Submit Order        │                          │
       ├───────────────────────►│                          │
       │ (PENDING_VERIFICATION) │                          │
       │                        │ 3. Enter Component Counts│
       │                        ├─────────────────────────►│
       │                        │ (COUNT_QC)               │
       │                        │                          │
       │                        │ 4. Evaluate Gate         │
       │                        │    If RED -> REJECTED    │
       │                        │    If GREEN/YELLOW ->    │
       │                        │    VERIFIED              │
       │                        │                          │
       │                        │                          │ 5. View Sewing Queue
       │                        │                          ├────────────────────►
       │                        │                          │ (VERIFIED & SEWING_IN_PROGRESS)
       │                        │                          │
       │                        │                          │ 6. Start Sewing
       │                        │                          ├────────────────────►
       │                        │                          │ (SEWING_IN_PROGRESS)
```

---

## Core Security & Architecture Principles

1. **Server-Authoritative Calculations**: Target piece counts, expected fabric usage, wastage percentages, and traffic light statuses are calculated exclusively on the server.
2. **Defensive Verification Gate**: Approval requires 100% item completion and zero RED shortages (`redCount === 0`). Any shortage halts batch approval at both API and service layers.
3. **Sewing Queue Isolation**: Orders in `CUTTING_IN_PROGRESS`, `PENDING_VERIFICATION`, `COUNT_QC`, or `REJECTED` states are strictly filtered out of sewing queue queries (`getSewingQueueOrders` returns only `VERIFIED` and `SEWING_IN_PROGRESS`).
4. **Append-Only Audit Trail**: All verification approvals and rejections create records in `verification_logs` capturing verifier ID, timestamp, Decision, wastage, and component snapshot, managed as append-only log entries by application design.
