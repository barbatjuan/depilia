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

## Slice C — NOT STARTED
Tasks C.1–C.8. Branch `caja-diaria-pr-c` off `caja-diaria-pr-b`.
