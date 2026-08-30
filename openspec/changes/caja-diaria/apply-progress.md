# Apply Progress: caja-diaria

## Slice A — DONE (commit 94f5f01 on branch `caja-diaria-pr-a`)

Tasks A.1–A.12 complete. Migration `0011_cash_register.sql` (cash_sessions,
cash_movements, current_staff_id(), cash_session_theoretical view, close
trigger, RLS), `expenses.method` threaded, 16 integration tests, seed-demo.
Verified: `pnpm test` 179 passed / 1 skipped, lint + typecheck clean.

## Slice B — IMPLEMENTED + GREEN, NOT COMMITTED (branch `caja-diaria-pr-b`)

Tasks B.1–B.16 all implemented following strict TDD (RED → GREEN → TRIANGULATE).

### Files created
- `src/features/cash/domain/movement.ts` — `MovementKind`/`MovementDirection`, `KIND_DIRECTION`, `signedAmount`, `directionForKind` (throws for `ajuste` with no direction)
- `src/features/cash/domain/theoretical-balance.ts` — `deriveTheoreticalCash` mirrors the SQL view formula exactly
- `src/features/cash/domain/arqueo.ts` — `deriveArqueo` (sobrante/faltante/exacto, |diff| < 0.005), `ARQUEO_LABEL`
- `src/features/cash/domain/cash-errors.ts` — `mapCashError` (23505 + 3 trigger exceptions → Spanish; `payment-errors.ts` template)
- `src/features/cash/domain/closed-caja-warning.ts` — `cashWithoutOpenSession`, `CLOSED_CAJA_WARNING`
- `src/features/cash/schema.ts` — `openSessionSchema`, `closeSessionSchema`, `movementSchema` (+ `MOVEMENT_KINDS`/`MOVEMENT_DIRECTIONS`)
- `src/features/cash/data/cash-session.ts` — `getSessionForDate`, `getOpenSession`, `listSessions`, `openSession`, `closeSession`
- `src/features/cash/data/cash-movements.ts` — `listMovements`, `createMovement`, `deleteMovement`
- `src/features/cash/data/cash-balance.ts` — `getTheoretical` (view), `listTodayCashPayments` (reuses `getClinicDayBounds`), `listCashExpensesForDate`
- `src/features/cash/actions/open-session.ts` — `openSessionAction` + shared `CashActionState`
- `src/features/cash/actions/close-session.ts` — `closeSessionAction` (bound sessionId)
- `src/features/cash/actions/register-movement.ts` — `registerMovementAction` (bound sessionId; `directionForKind` before zod)
- Unit tests: `tests/unit/features/cash/{movement,theoretical-balance,arqueo,cash-errors,closed-caja-warning,schema}.test.ts` (29 tests)
- `tests/integration/cash/parity.test.ts` — un-skipped (B.16); 2 tests: view ≡ close snapshot ≡ `deriveTheoreticalCash`, and SQL BA-day window ≡ `getClinicDayBounds` boundary instants

### Verification (real local Postgres, migration 0011 applied)
- `pnpm test` — **210 passed / 0 skipped** (up from 179/1); parity un-skipped and green
- `pnpm lint` — clean
- `pnpm typecheck` — clean

### BLOCKER: over review budget
- Slice B authored diff = **1145 changed lines** (src 702 + tests 443), forecast was ~340.
- Exceeds the 400-line review budget. Not committed pending a delivery decision:
  - Option 1: split B into sub-slices (e.g. B1 domain+schema+unit tests ~530, B2 data ~330, B3 actions+parity ~290 — B1 still >400, likely a 4-way split), OR
  - Option 2: accept `size:exception` for Slice B and commit as one PR.
- Working tree holds all Slice B files staged (except `.atl/`, `.codegraph/` which were unstaged). Rollback boundary: `rm -rf src/features/cash tests/unit/features/cash`, revert `tests/integration/cash/parity.test.ts`.

## Slice B — DONE (commit 016b0d4 on `caja-diaria-pr-b`) — `size:exception` accepted by user

Committed as a single PR under `size:exception` (1145 lines). Verification above stands.

## Slice C — DONE (branch `caja-diaria-pr-c` off `caja-diaria-pr-b` = 016b0d4) — `size:exception`

Tasks C.1–C.8 complete, strict TDD for every behaviour change (RED → GREEN → TRIANGULATE).

### Files created
- `src/app/(dashboard)/caja/page.tsx` — RSC, routing only; today BA `business_date` → `getSessionForDate` → 3 states (none → `OpenSessionForm`; open → `SessionSummaryCard` + `MovementForm` + `MovementTable` + `TodayCashPayments` + `CloseSessionForm`; closed → arqueo result + read-only movements + cash payments). "Ver historial de ventas" → `/ventas`.
- `src/features/cash/components/arqueo-badge.tsx` — `ArqueoBadge` (sobrante→default, faltante→destructive, exacto→secondary; pattern from `sale-status-badge.tsx`)
- `src/features/cash/components/session-summary-card.tsx` — live theoretical breakdown (open) / frozen arqueo snapshot (closed)
- `src/features/cash/components/movement-table.tsx` — read-only, signed amounts via `signedAmount`
- `src/features/cash/components/today-cash-payments.tsx` — read-only panel, each row links to its sale
- `src/features/cash/components/open-session-form.tsx` — client, hidden `businessDate`, advisory `previousCounted` prefill
- `src/features/cash/components/movement-form.tsx` — client, direction select shown only for `ajuste`
- `src/features/cash/components/close-session-form.tsx` — client, live `deriveArqueo` diff preview (`role="status"`), count not prefilled
- `src/features/expenses/actions/caja-redirect.ts` — shared `expenseRedirectTarget` (cash + no open session on `spentOn` → `/gastos?aviso=caja-cerrada`, swallows its own failure)
- `tests/unit/features/sales/register-payment-warning.test.ts` — 4 cases
- `tests/unit/features/expenses/expense-caja-warning.test.ts` — 4 cases
- `e2e/caja.spec.ts` — abrir → retiro → cerrar con arqueo; asserts `Faltante` badge + computed shortfall; service-role `resetTodayCaja` for determinism

### Files modified
- `src/components/nav-items.ts` — `Banknote` "Caja" → `/caja` inserted before "Ventas"
- `src/features/sales/actions/register-payment.ts` — non-blocking `warning?: string | null` on form state; post-insert cash-only `getSessionForDate` in try/catch
- `src/features/sales/components/register-payment-form.tsx` — renders `state.warning` with `role="status"` (errors keep `role="alert"`)
- `src/features/expenses/actions/{create,update}-expense.ts` — compute `expenseRedirectTarget` before `redirect(...)`
- `src/app/(dashboard)/gastos/page.tsx` — `searchParams.aviso === "caja-cerrada"` → `role="status"` banner (`CLOSED_CAJA_WARNING`)
- `tests/unit/components/nav-items.test.ts` — RED: expect "Caja" before "Ventas" + href + ordering
- `e2e/global-setup.ts` — idempotent `ensureOpenCajaToday` fixture (exported) + called in setup; keeps the UNCHANGED golden-path cash-expense step landing on `/gastos`

### Verification
- `pnpm test` — **220 passed / 0 skipped** (49 files; +10 vs Slice B: nav +2, payment-warning +4, expense-warning +4)
- `pnpm e2e` — **4 passed** (`caja.spec.ts`, `golden-path.spec.ts` unchanged, 2× `login.spec.ts`)
- `pnpm lint` — clean
- `pnpm typecheck` — clean

### Size
Authored diff ≈ 1251 additions / 9 deletions (~1193 authored, excl. `.atl/` `.codegraph/`). Forecast was ~320. Committed as `size:exception` per the standing user acceptance for this change (same as Slice B). Rollback boundary: `rm -rf src/features/cash/components src/app/(dashboard)/caja src/features/expenses/actions/caja-redirect.ts e2e/caja.spec.ts tests/unit/features/{sales/register-payment-warning,expenses/expense-caja-warning}.test.ts`; revert `nav-items.ts`, `register-payment{,-form}.tsx`, `{create,update}-expense.ts`, `gastos/page.tsx`, `nav-items.test.ts`, `e2e/global-setup.ts`.

### TDD Cycle Evidence
| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| C.3 | `tests/unit/components/nav-items.test.ts` | Unit | ✅ 5/5 | ✅ 2 failing | ✅ 7/7 | ✅ 3 cases (order, href, Ventas kept) | ➖ none needed |
| C.4/C.5 | `tests/unit/features/sales/register-payment-warning.test.ts` | Unit (action, 4 mocks) | N/A (new) | ✅ 1 failing | ✅ 4/4 | ✅ 4 cases (cash/no-session, card, cash/open, throw) | ➖ none needed |
| C.7 | `tests/unit/features/expenses/expense-caja-warning.test.ts` | Unit (action, 5 mocks) | N/A (new) | ✅ 2 failing | ✅ 4/4 | ✅ 4 cases (create no-session, create open, card, update) | ✅ extracted `expenseRedirectTarget` shared helper |
| C.1/C.2/C.6 | `e2e/caja.spec.ts` + `e2e/golden-path.spec.ts` | E2E | ✅ golden-path baseline green | ✅ new spec | ✅ 4/4 e2e | ➖ single golden flow | ➖ none |
| C.8 | `e2e/golden-path.spec.ts` (unchanged) | E2E | ✅ regression guard | ➖ | ✅ pass | ➖ | ➖ |
