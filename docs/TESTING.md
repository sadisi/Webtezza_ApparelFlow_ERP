# ApparelFlow ERP Testing Strategy & Verification Report

## Testing Architecture

ApparelFlow ERP incorporates a comprehensive automated test suite covering unit logic, service integration, security/RBAC enforcement, edge case validation, and end-to-end (E2E) workflows.

```text
┌────────────────────────────────────────────────────────┐
│                   Playwright E2E                       │
│     Full User Journeys & End-to-End Workflow           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Vitest Integration Tests               │
│     Service Tier, API Route Handlers, Role Security,   │
│     Approval Gateway, Sewing Queue Isolation            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Vitest Unit Tests                    │
│     Domain Math, State Machine, Traffic Light Gate,   │
│     Wastage Calculation, Auth Schema Validation       │
└────────────────────────────────────────────────────────┘
```

---

## Test Execution Summary

* **Test Framework**: Vitest `v3.1.0` (Unit & Integration) + Playwright `v1.50.0` (E2E)
* **Testing Library**: `@testing-library/react` `v16.3.0` & `@testing-library/user-event` `v14.6.1`
* **Test Suite Result**: 16 Test Files Passed (100% Pass Rate), 232 Total Tests Passed.

---

## Requirement Coverage Matrix

| Requirement | Test Coverage File(s) | Actual Test Count | Status |
| :--- | :--- | :---: | :---: |
| **GREEN Approval** | `tests/unit/domain.verificationGate.test.ts`<br>`tests/integration/approvalGateway.test.ts` | 19 tests | ✅ Passed |
| **RED Hard-Stop** | `tests/unit/domain.trafficLight.test.ts`<br>`tests/unit/domain.verificationGate.test.ts`<br>`tests/integration/approvalGateway.test.ts` | 29 tests | ✅ Passed |
| **Rejection Reason** | `tests/integration/verificationTerminalUI.test.ts`<br>`tests/integration/approvalGateway.test.ts` | 35 tests | ✅ Passed |
| **Non-Verifier 403** | `tests/integration/roleEnforcement.test.ts`<br>`tests/integration/securityAudit.test.ts` | 37 tests | ✅ Passed |
| **Sewing Isolation** | `tests/integration/sewingQueueIsolation.test.ts` | 19 tests | ✅ Passed |
| **RBAC Matrix** | `tests/unit/auth.roles.test.ts`<br>`tests/integration/roleEnforcement.test.ts` | 33 tests | ✅ Passed |
| **Input Validation** | `tests/unit/auth.validation.test.ts`<br>`tests/integration/validationEdgeCases.test.ts` | 42 tests | ✅ Passed |
| **State Machine** | `tests/unit/domain.stateMachine.test.ts` | 15 tests | ✅ Passed |

---

## Breakdown of Test Suites

### 1. Unit Tests (`tests/unit/`)
* `auth.roles.test.ts` (21 tests): Validates `USER_ROLES` parsing, role permission matrix lookup, and error branding.
* `auth.validation.test.ts` (20 tests): Validates email formatting, password constraints, and Zod schema boundaries.
* `domain.componentQuantity.test.ts` (8 tests): Validates piece calculation multiplier (`target_quantity * pieces_per_garment`).
* `domain.stateMachine.test.ts` (15 tests): Tests all valid and invalid lifecycle transitions across order states.
* `domain.trafficLight.test.ts` (10 tests): Tests exact component piece count evaluation (`GREEN`, `YELLOW`, `RED`).
* `domain.verificationGate.test.ts` (6 tests): Validates approval decision engine rules and shortage rejection logic.
* `domain.wastage.test.ts` (12 tests): Validates fabric wastage percentage formulas and recipe cap boundaries.
* `sanity.test.ts` (3 tests): Basic test suite verification and environment setup sanity checks.

### 2. Integration Tests (`tests/integration/`)
* `approvalGateway.test.ts` (13 tests): End-to-end integration testing of the batch approval and rejection API handlers.
* `cuttingOrderService.test.ts` (13 tests): Tests cutting order creation, database updates, and expected fabric calculations.
* `cuttingSupervisorUI.test.ts` (11 tests): Integration tests for Cutting Supervisor UI workflows and form validations.
* `roleEnforcement.test.ts` (12 tests): Verifies 403 Forbidden responses across all API endpoints when called by unauthorized roles.
* `securityAudit.test.ts` (25 tests): Audits IDOR vulnerabilities, state tampering, payload injection, and session authorization.
* `sewingQueueIsolation.test.ts` (19 tests): Verifies that only `VERIFIED` orders are exposed to sewing supervisors.
* `validationEdgeCases.test.ts` (22 tests): Tests edge case inputs including negative quantities, floating points, empty strings, and SQL injection payloads.
* `verificationTerminalUI.test.ts` (22 tests): Tests QC verifier terminal UI state, count entries, traffic light updates, and approval modal interactions.

### 3. End-to-End Tests (`tests/e2e/`)
* `fullWorkflow.spec.ts`: Playwright test executing the full production journey: order creation by supervisor → verification by verifier → queue processing by sewing supervisor.

---

## Testing Commands

Execute tests using `package.json` scripts:

```bash
# Run unit and integration tests (Vitest single run)
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with code coverage report
npm run test:coverage

# Run Playwright E2E tests
npm run test:e2e

# Open Playwright UI mode for interactive debugging
npm run test:e2e:ui

# Run TypeScript static type checker
npm run type-check

# Run ESLint linter
npm run lint
```
