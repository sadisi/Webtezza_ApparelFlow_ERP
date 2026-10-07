# ApparelFlow ERP Security Specification

## Security Architecture

ApparelFlow ERP implements defense-in-depth security to protect production data, enforce role separation, maintain audit integrity, and prevent unauthorized state manipulation.

---

## 1. Authentication & Session Management

* **Provider**: Supabase Auth with Server-Side Rendering (`@supabase/ssr`).
* **Session Transport**: HTTP-only, secure, `SameSite=Lax` cookies. Session credentials never leak into client-side `localStorage` or JavaScript state.
* **Context Resolution**: Server-side helper `getServerSession()` parses session cookies on every API route and server component request. Unauthenticated requests are rejected immediately with HTTP 401.

---

## 2. Role-Based Access Control (RBAC)

All endpoints enforce strict server-side role validation using `requireRole()` (`src/auth/requireRole.ts`). Client-side button hides or route redirects are strictly cosmetic; authorization is enforced at the API layer.

### Role Permission Matrix

| Capability | Cutting Supervisor (`cutting_supervisor`) | Cutting Verifier (`cutting_verifier`) | Sewing Supervisor (`sewing_supervisor`) |
| :--- | :---: | :---: | :---: |
| **Create cutting orders** | ✅ Allowed | ❌ Denied (403) | ❌ Denied (403) |
| **Submit orders for verification** | ✅ Allowed | ❌ Denied (403) | ❌ Denied (403) |
| **View verification terminal** | ❌ Denied (403) | ✅ Allowed | ❌ Denied (403) |
| **Verify batches (Count items)** | ❌ Denied (403) | ✅ Allowed | ❌ Denied (403) |
| **Approve batches** | ❌ Denied (403) | ✅ Allowed | ❌ Denied (403) |
| **Reject batches** | ❌ Denied (403) | ✅ Allowed | ❌ Denied (403) |
| **View sewing queue** | ❌ Denied (403) | ❌ Denied (403) | ✅ Allowed |
| **Start sewing** | ❌ Denied (403) | ❌ Denied (403) | ✅ Allowed |

---

## 3. Server-Side Hard-Stop Verification Gate

The verification gate is hardcoded on the server tier (`src/domain/trafficLight.ts` and `src/services/verificationService.ts`).
* **Rule**: Approval is physically impossible if any single component has a `RED` traffic light status (`actual_quantity < expected_quantity`).
* **Bypass Prevention**: Any API call attempting to trigger `/api/cutting-orders/[id]/verification/approve` on an order with uncounted items or `RED` shortages will fail on the server with a `400 Bad Request` or `422 Unprocessable Entity` containing detailed rejection reasons.
* **Surplus Policy**: `YELLOW` components (`actual_quantity > expected_quantity`) are logged as surpluses but do not block batch approval.

---

## 4. State Machine Protection

Garment orders progress through a strictly defined state machine (`src/domain/stateMachine.ts`):

```text
[CUTTING_IN_PROGRESS] ──► [PENDING_VERIFICATION] ──► [COUNT_QC] ──┬──► [VERIFIED] ──► [SEWING_IN_PROGRESS]
                                                                └──► [REJECTED]
```

* Invalid state jumps (e.g., directly moving from `CUTTING_IN_PROGRESS` to `VERIFIED` or `SEWING_IN_PROGRESS`) throw `StateTransitionError` and are rejected with HTTP 400.

---

## 5. Input Validation & SQL Injection Defense

* **Zod Schemas**: Incoming JSON payloads are validated with Zod schemas (`src/validation/`):
  * `orderSchemas.ts`: Rejects non-positive target quantities (`<= 0`), negative fabric lengths, decimal piece targets, or empty string values, and validates `recipe_id` as UUID.
  * `verificationSchemas.ts`: Rejects negative piece counts, floating-point component quantities, or missing rejection reasons on batch rejection.
* **Mass Assignment Defense**: API handlers explicitly pick validated fields from Zod output before calling service functions. Extra payload parameters injected by clients are stripped automatically.
* **SQL Injection Defense**: Database access uses `@supabase/supabase-js` parameterized PostgreSQL queries, separating SQL data security from Zod input schema validation.

---

## 6. Audit Trail & Non-Repudiation

* Every QC approval and rejection creates a record in `public.verification_logs`. By application design, `verification_logs` is treated strictly as an append-only log.
* The `verifier_id` and timestamp are populated from the authenticated server session context (`auth.uid()`), preventing identity spoofing.
* Rejections require a mandatory textual reason string (`reason.trim().length > 0`).

---

## 7. IDOR & Data Access Security

* Resource IDs (`[id]`) are validated as UUIDs before querying the database.
* Requests attempting to query non-existent or inaccessible order IDs return standard 404 responses without leaking resource existence details.
* Sewing queue endpoints (`/api/sewing/orders`) query database records with `status IN ('VERIFIED', 'SEWING_IN_PROGRESS')`. Unverified (`CUTTING_IN_PROGRESS`, `PENDING_VERIFICATION`, `COUNT_QC`) or `REJECTED` orders are strictly isolated from sewing queue queries.

---

## 8. Session & Redirect Security

* Authentication redirects use relative internal path validation (`validateRedirectUrl`) to prevent Open Redirect vulnerabilities.
* Logout invalidates the server-side cookie immediately (`/api/auth/logout`).

---

## 9. Database & Environment Security

* **Row Level Security**: RLS is enabled on all 6 tables in Supabase PostgreSQL (`users`, `recipes`, `recipe_components`, `cutting_orders`, `verification_items`, `verification_logs`).
* **Secrets Handling**: `SUPABASE_SERVICE_ROLE_KEY` is kept server-side only and never exposed with `NEXT_PUBLIC_` prefixes.

---

## 10. Automated Security Tests

The security architecture is continuously verified by automated integration tests:
* `tests/integration/roleEnforcement.test.ts`: 12 tests validating 403 Forbidden responses for unauthorized roles across all endpoints.
* `tests/integration/securityAudit.test.ts`: 25 tests verifying state tampering prevention, IDOR protection, injection defense, and verifier identity non-repudiation.
