# AI Optimization Report

## Executive Summary

ApparelFlow ERP was developed through a **human-led engineering workflow** with AI assistance provided by **ChatGPT** and **Google Gemini**. 

The human developer maintained complete engineering ownership and was solely responsible for:
* Requirements interpretation and domain boundary mapping
* Architecture decisions and system design
* Implementation direction and project scoping
* Reviewing, auditing, and testing AI-generated code
* Debugging runtime failures, RLS issues, and state edge cases
* Security decisions, RBAC matrix design, and IDOR protection
* Writing automated unit, integration, and security test suites
* Integration, code refactoring, and final system acceptance

AI assistants were utilized to accelerate development velocity, brainstorm alternative architectural patterns, generate boilerplates, and assist in documentation synthesis — **not to replace engineering responsibility**.

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
Human Review and Validation
      │
      ▼
Refactoring / Correction
      │
      ▼
Automated Testing (Vitest & Playwright)
      │
      ▼
Final Implementation
```

---

## 1. AI Tools and Prompting

### ChatGPT
ChatGPT served as an architecture discussion partner and implementation consultant throughout the project lifecycle. Realistic usage included:
* **Architecture Planning**: Structuring Next.js 16 App Router tiers, separating pure domain functions (`src/domain/`) from database queries (`src/db/`) and API handlers (`app/api/`).
* **Implementation Phasing**: Deconstructing the Webtezza assessment into modular, test-driven phases (Bootstrap → Schema & Auth → Core Domain → Services & API → UI → Security Audit).
* **Next.js & Supabase Guidance**: Formulating patterns for `@supabase/ssr` server-side session resolution and cookie management.
* **API & Domain Design**: Defining contracts for cutting order creation, QC verification terminal payloads, and sewing queue isolation.
* **Security & RBAC Review**: Auditing the RBAC permission matrix for Cutting Supervisors, Cutting Verifiers, and Sewing Supervisors.
* **Debugging & Test Strategy**: Assisting in designing integration test suites for state machine transitions and role security enforcement.
* **Documentation & Prompts**: Generating initial documentation drafts and structuring task prompts for Antigravity coding subagents.

### Google Gemini
Google Gemini was utilized as a complementary reasoning and code-generation assistant. Realistic usage included:
* **Alternative Solution Evaluation**: Comparing data fetching strategies (client-side vs server components vs service-role queries).
* **Code Generation & Boilerplate**: Generating TypeScript types, Zod validation schemas, and React component UI structures.
* **Reasoning & Debugging**: Analyzing stack traces and identifying root causes during complex database query integration.
* **Code Review & Edge Case Discovery**: Reviewing domain math functions to ensure boundary conditions (zero, negative numbers, floats) were properly guarded.
* **Refactoring Suggestions**: Evaluating component tree structures to improve reusability and accessibility across UI screens.

### Human Developer Workflow
AI suggestions were never blindly accepted. Every AI-assisted output passed through a strict 9-step engineering workflow:

1. **Understand Requirement**: Analyze Webtezza domain rules (e.g., zero RED shortage approval).
2. **Consult AI**: Prompt ChatGPT or Gemini for potential architecture patterns or code snippets.
3. **Review Generated Solution**: Critically inspect generated code for logic flaws, missing edge cases, or security vulnerabilities.
4. **Compare with Architecture**: Ensure alignment with project conventions (pure functions in domain layer, service role usage in API handlers).
5. **Implement or Modify**: Adapt and rewrite code snippets to fit codebase abstractions.
6. **Run Automated Tests**: Execute `npm test` and `npm run type-check` to verify functional correctness.
7. **Review Security Implications**: Audit for IDOR vulnerabilities, state tampering, or RLS bypasses.
8. **Refactor if Required**: Clean up code, improve error handling, and add comprehensive comments.
9. **Integrate into System**: Commit verified code into the project repository.

---

## 2. Flawed AI Code Instances

### Example 1 — Supabase Cookie Client RLS Read Block on API Routes (Repository Verified)

**AI-assisted implementation:**
Initial AI-generated API route handlers used the standard cookie-based Supabase server client (`createServerSupabaseClient()`) for database read queries in endpoints such as `app/api/recipes/route.ts`, `app/api/cutting-orders/route.ts`, and `app/api/sewing/orders/route.ts`.

**Problem:**
Supabase Row Level Security (RLS) policies on `public.recipes` and `public.cutting_orders` restricted standard client SELECT queries (e.g. `auth.uid() = id` on user profiles or default-deny on orders). When authenticated verifiers or sewing supervisors queried these endpoints via client requests, RLS blocked reads or returned empty datasets because the querying user was not the row creator.

**How it was discovered:**
Discovered during integration testing and manual verification of the Cutting Verifier and Sewing Supervisor workflows. Queries returned empty arrays or 404 errors despite valid authenticated sessions.

**Human correction:**
The human developer added `getReadSupabaseClient()` in `src/db/supabaseClient.ts` (Git Commit `ab8e9b31299fde6b16bd05e2106856ec4501fd85`). When `SUPABASE_SERVICE_ROLE_KEY` is present in server environments, `getReadSupabaseClient()` uses the admin service-role client to query database records **after** the API route handler has authenticated the user session and enforced application-level role authorization (`requireRole()`).

**Final result:**
Validated via Git Commit `ab8e9b31299fde6b16bd05e2106856ec4501fd85` and automated integration tests in `tests/integration/roleEnforcement.test.ts`. API routes reliably fetch domain data while preserving strict API-tier authorization.

---

### Example 2 — Developer Evidence Required

> [!IMPORTANT]
> **Developer Evidence Required**: Provide a second authentic instance of flawed AI-generated code from your ChatGPT or Google Gemini conversation logs.
>
> To maintain strict technical accuracy and avoid fabricating historical Git events, document a real prompt iteration or code suggestion from your development session logs (e.g., initial client-side verification gate prompt, unsafe redirect handling suggestion, or missing server-side input validation).
>
> **Required Format for Example 2**:
> * **AI-assisted implementation**: Describe what was initially suggested in your chat history.
> * **Problem**: Explain why the suggestion was incorrect or incomplete.
> * **How it was discovered**: Explain how testing or code review uncovered the issue.
> * **Human correction**: Explain the fix or refactoring implemented in the code.
> * **Final result**: Explain how the corrected implementation was validated.

---

## 3. Human Refactoring and Engineering Decisions

The developer systematically audited and refactored AI suggestions across all system layers:

1. **Server-Side RBAC (`requireRole`)**: Replaced ad-hoc inline role checks with a centralized, type-safe authorization helper (`src/auth/requireRole.ts`). It authenticates sessions via `getServerSession()`, queries `public.users` via `getReadSupabaseClient()`, checks permissions against `src/auth/roles.ts`, and throws structured `AuthError` (401/403) on failure.
2. **Authenticated Context Resolution**: Enforced `getServerSession()` across all API routes to ensure user identity is derived strictly from server-validated `@supabase/ssr` HTTP-only cookies.
3. **Zod Input Validation**: Created strict validation schemas (`src/validation/`) to validate payload structures, integer boundaries (`.int()`), non-negative quantities (`.nonnegative()`, `.positive()`), string lengths, and UUID formats (`recipe_id.uuid()`).
4. **Database Query Parameterization**: Relying on Supabase/PostgreSQL client parameterized queries to guard against SQL injection, separating data access protection from application schema validation.
5. **State Machine Protection**: Encapsulated lifecycle transition rules in `src/domain/stateMachine.ts`. Allowed transitions: `CUTTING_IN_PROGRESS` → `PENDING_VERIFICATION` → `COUNT_QC` → `VERIFIED` / `REJECTED` → `SEWING_IN_PROGRESS`.
6. **Verification Hard-Stop Enforcement**: Built `src/domain/trafficLight.ts` and `src/services/verificationService.ts` to recompute expected quantities (`target_quantity * pieces_per_garment`), evaluate item counts (`GREEN` exact, `YELLOW` surplus, `RED` shortage), and halt approval whenever `redCount > 0` or uncounted items remain.
7. **Append-Only Audit Trail**: Implemented `verification_logs` insertions on every approval and rejection. While the database schema permits standard table operations via service role, application code strictly treats `verification_logs` as an append-only log binding verifier ID, timestamp, decision, wastage, and item snapshot.
8. **Sewing Queue Isolation**: Implemented `getSewingQueueOrders()` in `src/db/queries/sewingQueue.ts`, which queries cutting orders with `status IN ('VERIFIED', 'SEWING_IN_PROGRESS')`, strictly filtering out `CUTTING_IN_PROGRESS`, `PENDING_VERIFICATION`, `COUNT_QC`, and `REJECTED` orders.
9. **Structured Error Handling**: Defined custom error classes (`AuthError`, `DomainError`, `VerificationGateError`, `StateTransitionError`) to return consistent, typed HTTP error payloads.
10. **Automated Test Suite**: Wrote 16 test files (232 tests) using Vitest and Playwright to achieve high confidence across logic, security, and UI tiers.

---

## 4. Defensive Architecture

ApparelFlow ERP incorporates robust defensive security mechanisms:

* **Authentication**: Server-side session resolution via `@supabase/ssr` using HTTP-only, `SameSite=Lax` cookies.
* **Service Role Key Isolation**: `SUPABASE_SERVICE_ROLE_KEY` is restricted strictly to server-side environments and never exposed via `NEXT_PUBLIC_` prefixes.
* **RBAC Enforcement**: Server-enforced role checking (`cutting_supervisor`, `cutting_verifier`, `sewing_supervisor`) on every API endpoint prior to database interaction.
* **State Machine Guard**: Strict transition enforcement preventing illegal lifecycle jumps.
* **Verification Hard Stop**: Physical count shortages (`RED`) hard-stop batch approval at the API tier.
* **Input & Query Protection**: Zod schema validation for input payload structures combined with parameterized PostgreSQL queries for SQL injection defense.
* **Server-Authoritative Calculations**: Target piece multipliers, expected fabric usage, wastage percentages, and traffic lights computed exclusively on the server.
* **Append-Only Audit Trail**: Application-level append-only logging in `verification_logs` capturing verifier identity, decision, timestamp, wastage, and item count snapshots.
* **Sewing Queue Query Isolation**: Database queries for sewing queue strictly filter by `status IN ('VERIFIED', 'SEWING_IN_PROGRESS')`.
* **IDOR Protection**: All resource accesses validate UUID formats and check authenticated user permissions before returning resource details.
* **Database RLS**: Row Level Security enabled on all 6 tables as defense-in-depth against direct client database queries.
