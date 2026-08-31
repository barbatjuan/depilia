# Proposal: promociones (combos, per-sale discounts, discount codes)

> Artifact store: hybrid. Mirrors Engram `sdd/promociones/proposal`.
> Base: feature-branch-chain off `c664ecb` (archived catalogo-tarifas). NEVER `main`. Chained PRs mandatory.
> Locked decisions: Engram #148 (user-confirmed 2026-08-31) — not re-opened here.

## Intent

Depilia sells multi-zone bundles, "6+2" bonus bonos, ad-hoc price cuts, and paper coupons today, but `sales` only stores a single `total` price snapshot with no discount concept. Staff cannot record why a price was lowered, cannot bundle zones into one payment plan, and coupons are tracked by hand (over-issue risk). This change gives the app a first-class money model (`list_total` vs `total` + `discount_amount`), combo/bonus promotions administered like tariffs, and validated single-use discount codes — without touching caja, arqueo, or the derived balance views (all payment-driven, no ripple).

## Scope

### In Scope
- `sales` money model: `list_total`, `discount_amount`, `discount_reason`, `promotion_id`, `discount_code_id`, `discounted_by`; `CHECK(total = list_total - discount_amount)`, `total >= 0.01`.
- Manual per-sale discount (% or fixed) at **Vender paquete** and **Sesión suelta**.
- Discount codes: `discount_codes` table, checkout entry + atomic usage guard (BEFORE INSERT trigger, `FOR UPDATE`), void decrement, `/configuracion/codigos` ABM.
- Combo + bonus promotions: `promotions` (`kind in ('combo','bonus')`) + `promotion_items` + `sale_packages` join; one combo = one `sales` row / one payment plan / N `client_packages`; `/configuracion/promociones` ABM.
- Migration `0015` (backfill + CHECKs + RLS + partial indexes + trigger), `truncate_table` allow-list, `types.ts` regen.
- Ventas list/detail: display-only struck `list_total` + discount + promo/code label.

### Out of Scope
- "Seasonal % off a tariff" as an auto-applied promotion (dropped — discounting lives only in codes + manual per-sale).
- Stacking: a code AND a manual discount on one sale.
- Fully-comped (100% / `total = 0`) sales.
- Per-tariff / per-client / first-visit code targeting (columns can be added later).
- Combos on **Sesión suelta**; refund/partial-void money flows; RPC/transactional wrapping of the 2-insert sell path.
- Changes to `sale_balances`, `deriveSaleBalance`, caja/arqueo views, dashboard KPI.

## Capabilities

> Split into 3 new capabilities: `promotions` and `discount-codes` are independently-administered catalog entities with their own routes/Cards and lifecycles; `sale-discounts` is a `sales` money-model change with no ABM. The split maps 1:1 onto the slice chain (P2→`sale-discounts`, P3+P6→`discount-codes`, P4+P5→`promotions`) and keeps each spec focused under review budget.

### New Capabilities
- `sale-discounts`: the `sales` money model (`list_total` vs `total`, `discount_amount`, `discount_reason`, `discounted_by` audit), pure %/fixed discount math rounded to currency digits, manual per-sale discount at both checkout flows, the code-XOR-manual no-stacking rule, and the `total >= 0.01` (no 100% discount) prohibition.
- `discount-codes`: `discount_codes` definition, `/configuracion/codigos` ABM (archive-only, `active` flag), checkout validation (active / in-window / not exhausted), atomic `used_count` increment via BEFORE INSERT trigger, and decrement on sale void.
- `promotions`: `combo` + `bonus` promotion definitions and `promotion_items`, `/configuracion/promociones` ABM, `sale_packages` join, the combo sell path (one `sales` row, N `client_packages`, `sales.client_package_id` left null), and bonus-session math (`total_sessions = default_sessions + bonus_sessions`, price = `override_price` or `bono_price`).

### Modified Capabilities
- `service-catalog`: "Selling a bono" and "Selling a loose session" requirements extended to accept an optional discount (manual or code); "Selling a bono" additionally accepts an optional `combo`/`bonus` promotion. `promotion_items.tariff_id → package_templates ON DELETE RESTRICT`.

## Approach

Postgres owns the money invariants, mirroring `payments_reject_overpayment`:
- Additive migration `0015`. `sales` gains 6 columns; backfill `list_total = total`, `discount_amount = 0`, then `SET NOT NULL` + add `CHECK(total = list_total - discount_amount)` (existing `total > 0` stays; discount validation enforces `total >= 0.01`).
- New tables `promotions`, `promotion_items`, `discount_codes`, `sale_packages` with `is_staff()` RLS verbatim, partial unique indexes (`promotion_id,tariff_id`; `lower(code) where active`; `client_package_id`).
- Code-usage guard: BEFORE INSERT ON `sales` trigger — when `discount_code_id` set, lock the code `FOR UPDATE`, reject inactive / out-of-window (BA business date at sale time) / exhausted, else `used_count++`. Void trigger (`status → void`) decrements.
- Discount math: new pure `src/features/*/domain/discount.ts` (%/fixed, clamp `total >= 0.01`, round to `clinic-currency` digits); unit-tested. Payload builders carry `listTotal / discountAmount / discountReason / promotionId? / discountCodeId?`; both data fns + both server actions resolve promo/code, validate window, map `23514` / trigger errors to Spanish.
- Combos: `PackageSaleRequest` gains `source: "promotion"`; combo insert writes one `sales` row + N `client_packages` + N `sale_packages` join rows (`client_package_id` null on the sale).
- ABMs: `src/features/promotions/` and `src/features/discount-codes/` mirror `src/features/settings/` tarifas (data / schema / `domain/*-errors.ts` / actions / components); routes under `/configuracion/promociones/**` and `/configuracion/codigos/**`; two new `/configuracion` Cards; `nav-items.ts` unchanged.

### Assumptions — resolved open questions (recommended answers)
| OQ | Resolution |
|----|-----------|
| OQ3 bonus "6+2" | `promotion_items.bonus_sessions int` added to `default_sessions`; sale total = `bono_price` or `override_price`; no per-session price change. |
| OQ6 code scope | GLOBAL only; no per-tariff/client/first-visit columns in this change. |
| OQ7 date window | Plain `date` columns, evaluated against the BA business date at sale time only — never re-checked on later sale edits. |
| OQ9 100% discount | Forbidden. Discount validation keeps `total >= 0.01`; a fully-comped sale is out of scope. |
| OQ10 void | Trigger on `status → void` decrements `used_count` for a code-bearing sale. No promo-availability restore beyond that. |
| OQ11 flow coverage | Manual discount + codes apply to BOTH Vender paquete and Sesión suelta. Combos apply to Vender paquete only. |
| OQ12 audit | Record `discounted_by uuid → staff ON DELETE SET NULL` on `sales` when any discount is applied (mirrors caja `opened_by`). |

## Feature Branch Chain (off `c664ecb`)

Tracker/integration branch: `promociones`. PR #1 targets `promociones`; each later PR targets the immediately previous slice branch. Rebase until child diffs are clean. No `size:exception` — every slice is under the 400 authored-line budget (`types.ts` generated, excluded).

| # | Branch | Targets | Scope | ~Lines | Budget |
|---|--------|---------|-------|-------:|--------|
| P1 | `promociones-pr1-migration` | `promociones` | `0015` migration: `sales` discount cols + backfill + CHECKs; `promotions` / `promotion_items` / `discount_codes` / `sale_packages` + RLS + partial indexes; code-usage BEFORE INSERT trigger + void decrement; `truncate_table` allow-list; `types.ts` regen; integration tests (CHECK, backfill, RLS, usage race, window, void decrement). | 310 | HIGH |
| P2 | `promociones-pr2-sale-discount` | P1 | Pure `domain/discount.ts` (unit); payload builders; `sellPackage` / `sellLooseSession`; `packages/schema.ts` superRefine; discount UI in both forms; `package-sale-actions.tsx`; `discounted_by` wiring; unit + integration. | 350 | MED |
| P3 | `promociones-pr3-codes-checkout` | P2 | `data/discount-codes.ts` (`validateCode`, resolve at checkout); code input in both forms + actions; XOR-with-manual guard; Spanish error mapping (`23514` / trigger); usage-tracking + void integration tests. | 300 | MED |
| P4 | `promociones-pr4-combos-sell` | P3 | `source: "promotion"` variant; one-`sales`-row + N `client_packages` + `sale_packages` join insert; bonus-session math; combo/bonus picker in `sell-package-form.tsx`; unit + integration (join, balance, bonus sessions). Split P4a (bonus, single-zone) / P4b (multi-zone combo) if it overflows. | 380 | HIGH |
| P5 | `promociones-pr5-promociones-abm` | P4 | `src/features/promotions/**` + 3 routes (`/configuracion/promociones/{,nueva,[id]/editar}`) + form / list / columns / archive + error mapper + `/configuracion` Card + unit tests. | 370 | MED |
| P6 | `promociones-pr6-codigos-abm` | P5 | `src/features/discount-codes/**` + 3 routes (`/configuracion/codigos/**`) + form / list / columns / archive + error mapper + `/configuracion` Card + unit tests. | 320 | LOW |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/0015_*.sql` | New | Schema, backfill, RLS, partial indexes, usage + void triggers. |
| `supabase/migrations/*truncate_table*` redefinition | Modified | Add `promotions`, `promotion_items`, `discount_codes`, `sale_packages`. |
| `src/lib/supabase/types.ts` | Modified (generated) | Regen after `0015`. Excluded from authored count. |
| `src/features/packages/domain/{sell-package,discount}.ts` | New / Modified | Discount math; payloads carry list_total / discount / promo / code. |
| `src/features/packages/data/sell-package.ts` | Modified | Discount + combo insert paths; `sale_packages` join. |
| `src/features/packages/actions/{sell-package,sell-loose-session}.ts` | Modified | Resolve promo/code, validate window, map errors. |
| `src/features/packages/schema.ts` + `components/*-form.tsx` | Modified | Discount + code + combo inputs; superRefine XOR. |
| `src/features/promotions/**` (new dir) | New | Combos/bonus ABM (data / schema / domain / actions / components). |
| `src/features/discount-codes/**` (new dir) | New | Codes ABM. |
| `src/app/(dashboard)/configuracion/{promociones,codigos}/**` | New | ABM route trees. |
| `src/app/(dashboard)/configuracion/page.tsx` | Modified | Two new Cards. |
| `src/features/sales/data/sales.ts` + `ventas/[id]/page.tsx` + `sales/components/columns.tsx` | Modified | Display-only struck `list_total` + discount + label. |
| `tests/integration/helpers/fixtures.ts`, `sell-package.test.ts` | Modified | New columns. |
| `e2e/global-setup.ts`, `seed-demo.mjs` | Modified (optional) | Demo promo + code. |
| Caja / arqueo views, `sale_balances`, `deriveSaleBalance`, dashboard KPI | Unaffected | Payment-driven; discount only lowers the payment cap. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Discount-code usage race (naive `used_count++` in the 2-insert JS path over-issues) | High | `FOR UPDATE` lock in a BEFORE INSERT trigger; integration test with concurrent inserts. |
| Multi-zone combo vs `sales.client_package_id` 1:1 UNIQUE | Med | `sale_packages` join (locked OQ1); combos leave `client_package_id` null; join carries N packages. |
| 2-insert non-transactional sell path — combos widen the orphan window | Med | Keep MVP tradeoff; document; consider combo RPC in a follow-up. Not blocking. |
| Rounding drift on % discounts | Med | Round to `clinic-currency` digits in pure `discount.ts`; clamp `total >= 0.01`; unit tests. |
| P4 exceeds 400-line budget | Med | Pre-split into P4a (bonus) / P4b (multi-zone combo). |
| Void flow is currently minimal — decrement trigger touches it | Low | Trigger only on `status → void` for code-bearing sales; integration test. |
| `buildPackageSalePayload` has no existing unit test | Low | P2 adds direct unit coverage for the payload builder. |

## Rollback Plan

Chained PRs — revert in reverse order (P6 → P1); each slice is autonomous:

| Slice | Rollback |
|-------|----------|
| P6 | Revert PR; drop `/configuracion/codigos` + `src/features/discount-codes/`. Codes still work at checkout (P3). No schema impact. |
| P5 | Revert PR; drop `/configuracion/promociones` + `src/features/promotions/`. Combo sell path (P4) still works; promotions seeded via SQL only. |
| P4 | Revert PR; combo/bonus sell path removed; `sale_packages` stays empty. Single-package + discount paths unaffected. |
| P3 | Revert PR; code input removed; `discount_code_id` always null; manual discount (P2) unaffected. Trigger stays (no-op when column null). |
| P2 | Revert PR; discount UI removed; `discount_amount` stays 0, `list_total = total`. Sales revert to plain price snapshot. |
| P1 | Down migration: drop new tables, drop added `sales` columns + CHECKs + triggers, restore `truncate_table` allow-list, regen `types.ts`. Safe while chain unpushed / zero promo+discount data (prod has 0 sales rows). |

## Dependencies

- `service-catalog` spec — `promotion_items.tariff_id → package_templates`; extends "Selling a bono" / "Selling a loose session".
- `clinic-currency` spec — discount math rounds to the clinic's currency digits.
- `cash-register` spec — verify NO ripple: caja/arqueo derive from actual payments + expenses + movements, never `sales.total`; a discount only lowers the payment cap.

## Success Criteria

- [ ] Migration `0015` applies and rolls back cleanly on a DB with zero sales rows; `list_total` / `discount_amount` backfilled and `NOT NULL`.
- [ ] `CHECK(total = list_total - discount_amount)` and `total >= 0.01` reject invalid discounts; 100% discount is rejected.
- [ ] Staff can apply a % or fixed discount with a reason at Vender paquete and Sesión suelta; `discounted_by` is recorded.
- [ ] A valid code applied at checkout increments `used_count` atomically; an exhausted / inactive / out-of-window code is rejected in Spanish; voiding a code-bearing sale decrements `used_count`.
- [ ] Checkout rejects a code + manual discount on the same sale (no stacking).
- [ ] Selling a multi-zone combo creates one `sales` row (one balance / payment plan) with N `client_packages` via `sale_packages`; a "6+2" bonus yields `total_sessions = 8` at `bono_price`/`override_price`.
- [ ] `/configuracion/promociones` and `/configuracion/codigos` ABMs create / edit / archive (never hard-delete where FK is SET NULL); both appear as `/configuracion` Cards.
- [ ] Ventas list/detail show struck `list_total` + discount + promo/code label; `sale_balances`, `deriveSaleBalance`, caja/arqueo, dashboard KPI unchanged.
- [ ] Every slice PR diff is under the 400 authored-line review budget; no `size:exception`.
