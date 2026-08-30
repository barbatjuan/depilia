# Proposal: Caja Diaria (daily cash register)

## Intent

Nothing in Depilia represents physical cash. The operator cannot answer "how much should be in the drawer?" nor reconcile the count at end of day, so shortfalls stay invisible. `expenses` has no `method`, so cash and transfer outflows are indistinguishable — any cash arithmetic today is wrong by construction. Add an apertura/cierre + arqueo cycle over the existing money model.

## Scope

### In Scope
- `expenses.method` enum `('cash','card','transfer','other')` default `'cash'` (parity with `payments.method`), wired through schema/form/action.
- `cash_sessions`: one per BA day (`UNIQUE(business_date)`), manual `opening_amount`, `counted_amount` at close.
- `cash_movements`: fixed `kind` (`retiro`, `ingreso`, `adelanto`, `pago_proveedor`, `ajuste`), positive amount, sign derived from kind.
- Theoretical = opening + cash payments in day window + signed movements − cash expenses of `business_date`. View while open; `theoretical_amount` + `difference` snapshotted at close.
- `/caja`: apertura, cierre + arqueo, movement CRUD, read-only "cobros en efectivo de hoy", link to `/ventas`. Nav gains "Caja".
- Non-blocking warning when cash moves with no open session.

### Out of Scope
- Multi-drawer, turno handover, X/Z reports, denomination breakdown, editing a closed arqueo.
- Reopening a closed session; hard block (E1) on closed-caja cash.
- Any change to `/ventas`, `/ventas/[id]`, or the verified E2E golden path.
- Promoting `CLINIC_TZ` to `src/lib/`.

## Capabilities

### New Capabilities
- `cash-register`: session lifecycle, theoretical-balance derivation, cash movements, closed-caja warning, expense payment-method attribution.

### Modified Capabilities
- None. `openspec/specs/` does not exist (MVP ran engram-only), so `expenses.method` and the warning belong inside the new `cash-register` spec.

## Approach

Single `0011_cash_register.sql`, ordered: `expenses.method` ALTER → `cash_sessions` → `cash_movements` → `cash_session_theoretical` view (open only) → `BEFORE UPDATE` close trigger validating `open→closed` with non-null count and writing the snapshot (`payments_reject_overpayment` template). **No trigger on `payments`/`expenses`** — warn-don't-block keeps the rule in the UI and the verified payment path untouched.

Payment↔session is a time window (`getClinicDayBounds` over `paid_at`), not an FK: an FK would demand an open session to insert cash. Expenses join `spent_on = business_date`. E1 later needs only a trigger, no column.

A closed session is terminal: single operator, one session/day, `opening_amount` entered manually each morning (form prefills the prior count as UI convenience), so a mis-count cannot propagate. `status` stays a text CHECK so `'reopened'` can be added without churn.

New `src/features/cash/` mirrors `sales`: `domain/theoretical-balance.ts` (pure, mirrors the view as `deriveSaleBalance` mirrors `sale_balances`), `domain/arqueo.ts`, `data/`, `actions/`, `schema.ts`, `components/`. `is_staff()` RLS on both tables; actor FKs to `staff(id)`.

Slices for the 400-line budget: (1) migration + `expenses.method` + integration tests; (2) `cash` domain/data/actions + unit tests; (3) `/caja` page, components, nav, warning.

## Affected Areas

| Area | Impact |
|------|--------|
| `supabase/migrations/0011_cash_register.sql` | New — tables, view, trigger, RLS |
| `src/features/cash/**`, `src/app/(dashboard)/caja/page.tsx` | New — slice + RSC route |
| `src/features/expenses/**` | Modified — `method` field |
| `src/components/nav-items.ts` | Modified — add "Caja" |
| `src/features/sales/actions/register-payment.ts` | Modified — warning only |
| `scripts/seed-demo.mjs` | Modified — seed an open session |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Post-close edits rewrite history | High | Snapshot at close; view only while open |
| `method` backfill defaults old rows to cash | Med | Pre-production volume; document assumption |
| Warn-only arqueo drifts | Med | Accepted; E1 is a follow-up |
| Payment near midnight lands in wrong session | Low | `ajuste` movement is the escape hatch |
| Scope creep to multi-drawer / Z reports | Med | Fenced above |

## Rollback Plan

0011 is additive: drop trigger, view, `cash_movements`, `cash_sessions`, then `expenses.method`. Revert the `cash` slice, `/caja`, and the nav entry. `sales` and the E2E path are untouched, so the reverted state has no regression surface. Each slice reverts independently in reverse order.

## Dependencies

- Local Supabase (`supabase start`) for integration tests.
- `getClinicDayBounds` / `CLINIC_TZ` from `src/features/dashboard/domain/schedule.ts`.

## Success Criteria

- [ ] Operator opens with a float, records movements, closes with a physical count.
- [ ] Arqueo shows theoretical, counted, signed difference labelled sobrante/faltante.
- [ ] Only `method='cash'` rows move the theoretical balance; card/transfer reported separately.
- [ ] Duplicate `business_date` rejected by the DB, surfaced in Spanish.
- [ ] Editing a payment after close leaves that arqueo unchanged.
- [ ] `pnpm test` passes, MVP E2E golden path included.
