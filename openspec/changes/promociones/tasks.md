# Tasks: promociones (combos, per-sale discounts, discount codes)

Hybrid store — Engram topic `sdd/promociones/tasks`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2000 authored — P1 ~320, P2 ~360, P3 ~300, P4 ~380 (P4a ~210 / P4b ~200), P5 ~370, P6 ~320 (generated `src/lib/supabase/types.ts` excluded) |
| 400-line budget risk | Medium — every slice under 400; P1/P2/P4/P5 within ~20-80 of the cap |
| Chained PRs recommended | Yes |
| Suggested split | PR P1 → P2 → P3 → P4 (→ P4a → P4b if P4 forecasts >400) → P5 → P6 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain off `c664ecb`, tracker branch `promociones`, never `main` |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

PR P1 targets tracker `promociones`; each child targets its immediate predecessor (P2→P1, P3→P2, P4→P3, P5→P4, P6→P5). If P4 authored lines exceed 400 at apply time, use the pre-authorized split: P4a targets P3, P4b targets P4a, P5 then targets P4b. If a child diff shows a predecessor's changes, retarget/rebase before review. Every slice fits under 400 authored lines — **no `size:exception`**.

### Suggested Work Units

| Unit | Goal | PR (base) | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| P1 | `0015` migration (4 tables + `sales` ALTER + backfill + 2 CHECKs + RLS + partial indexes + usage/void triggers + `create_combo_sale` RPC + truncate allow-list) + types regen + integration tests | P1 (tracker) | `pnpm test tests/integration/promotions/schema.test.ts` | local `supabase start` + `pnpm test` | down migration drops 4 tables + `sales` cols/CHECKs/triggers, restores `truncate_table`, regen types (0 sales rows in prod) |
| P2 | pure `domain/discount.ts` + unit; per-sale manual discount in both sell flows + schema superRefine + UI + ventas display | P2 (P1) | `pnpm test tests/unit/features/promotions/discount.test.ts` | `pnpm test` + golden path e2e | revert discount UI + payload cols; `discount_amount` stays 0, `list_total = total` |
| P3 | discount-codes checkout — `validateDiscountCode`, code input both forms, code-XOR-manual guard, Spanish error mapping, usage/void integration | P3 (P2) | `pnpm test tests/integration/promotions/discount-codes.test.ts` | local Postgres + `pnpm test` | remove code input; `discount_code_id` null; trigger no-op |
| P4 | combos sell path — `create_combo_sale` wiring, `sale_packages`, bonus-session math, combo/bonus picker | P4 (P3) | `pnpm test tests/integration/promotions/combo-sell.test.ts` | local Postgres + `pnpm test` | combo/bonus picker removed, `sale_packages` empty; single-package + discount unaffected |
| P4a | single-zone bonus sell (2-insert, `promotion_id` on sale) + bonus math + bonus picker + tests | P4a (P3) | `pnpm test tests/integration/promotions/bonus-sell.test.ts` | local Postgres + `pnpm test` | drop bonus picker; `promotion_id` null |
| P4b | multi-item combo picker + `sellCombo` RPC wrapper + combo integration (1 sale / N packages / N join / single `sale_balances`) | P4b (P4a) | `pnpm test tests/integration/promotions/combo-sell.test.ts` | local Postgres + `pnpm test` | drop combo picker + wrapper; RPC stays unused |
| P5 | `/configuracion/promociones` ABM — `src/features/promotions/**` + 3 routes + form/list/columns/archive + error mapper + Card | P5 (P4/P4b) | `pnpm test tests/integration/promotions/promotions-abm.test.ts` | local Postgres + `pnpm test` | revert-only, additive |
| P6 | `/configuracion/codigos` ABM — `src/features/discount-codes/**` + 3 routes + form/list/columns/archive + error mapper + Card | P6 (P5) | `pnpm test tests/integration/promotions/discount-codes-abm.test.ts` | local Postgres + `pnpm test` | revert-only, additive |

Strict TDD: a RED (failing) test precedes every GREEN task. SQL invariants run against real local Postgres, never mocked. Threat matrix: N/A per design (app routes, not command routing); `create_combo_sale` is SECURITY DEFINER SQL with typed inputs and no dynamic SQL, reached via PostgREST `rpc()` under `is_staff()` — covered by the RLS + combo-RPC integration tests.

Accepted design calls (do not re-litigate): combo sell path uses a dedicated `create_combo_sale` SECURITY DEFINER RPC (single-package path unchanged); a combo/bonus sale MAY also carry a code or manual discount (only code-XOR-manual is forbidden); `discount_codes.code/kind/value` are immutable once `used_count > 0`.

## Phase P1: Migration `0015` + triggers + combo RPC (specs sale-discounts, discount-codes, promotions)

- [x] P1.1 RED integ: `CHECK(total = list_total - discount_amount)` rejects mismatch; `discount_amount >= 0`; `total >= 0.01` (100% / comped rejected, 119.99 on 120 allowed) — `tests/integration/promotions/schema.test.ts`
- [x] P1.2 RED integ: backfill sets `list_total = total`, `discount_amount = 0` on existing sales; `SET NOT NULL` holds — same file
- [x] P1.3 RED integ: RLS denies non-staff JWT on `promotions`, `promotion_items`, `discount_codes`, `sale_packages` — same file
- [x] P1.4 RED integ: concurrent inserts using a `max_uses = 1` code → exactly one sale commits, `used_count = 1` (BEFORE INSERT `FOR UPDATE` trigger) — `tests/integration/promotions/discount-codes.test.ts`
- [x] P1.5 RED integ: code date window vs `(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date` — out-of-window insert rejected, in-window increments — same file
- [x] P1.6 RED integ: `status -> void` on a code-bearing sale decrements `used_count` (floor 0); non-code void is a no-op — same file
- [x] P1.7 RED integ: `create_combo_sale` → one `sales` row (`client_package_id` NULL, `promotion_id` set) + N `client_packages` + N `sale_packages` + single `sale_balances` row; forced partial failure rolls the whole call back — `tests/integration/promotions/combo-sell.test.ts`
- [x] P1.8 RED integ: partial unique indexes — `(promotion_id, tariff_id)`; `lower(code) WHERE active`; `sale_packages.client_package_id` UNIQUE — `tests/integration/promotions/schema.test.ts`
- [x] P1.9 RED integ: `discount_codes` CHECKs — `value > 0`, `max_uses > 0` (nullable), `used_count >= 0`, `max_uses IS NULL OR used_count <= max_uses`; `promotion_items` CHECKs — `bonus_sessions >= 0`, `override_price > 0` — same file
- [x] P1.10 GREEN `supabase/migrations/0015_promotions.sql` — ordered per design: (1) `promotions`, `promotion_items`, `discount_codes` (citext); (2) `sales` ADD `list_total`/`discount_amount`/`discount_reason`/`promotion_id`/`discount_code_id`/`discounted_by` (FK SET NULL) + backfill + `SET NOT NULL` + 2 CHECKs; (3) `sale_packages`; (4) `is_staff()` RLS on all 4; (5) `sales_apply_discount_code()` BEFORE INSERT trigger; (6) `sales_release_discount_code()` AFTER UPDATE trigger; (7) `create_combo_sale(p_client_id, p_promotion_id, p_description, p_list_total, p_discount_amount, p_discount_reason, p_discount_code_id, p_discounted_by, p_lines jsonb) RETURNS uuid` SECURITY DEFINER; (8) `truncate_table` allow-list += `promotions`, `promotion_items`, `discount_codes`, `sale_packages`
- [x] P1.11 GREEN regenerate `src/lib/supabase/types.ts`
- [x] P1.12 GREEN `tests/integration/helpers/fixtures.ts` — `seedPromotion`, `seedPromotionItem`, `seedDiscountCode` helpers
- [x] P1.13 GREEN run `pnpm test` integration + golden path; confirm green on migrated schema

## Phase P2: Pure discount math + per-sale manual discount (spec sale-discounts)

- [x] P2.1 RED unit: `applyDiscount({listTotal,kind,value,fractionDigits})` — percent = `round(listTotal*value/100, digits)`, fixed verbatim, clamp negative → 0, returns `{ok:false,reason:"exceeds"}` when `discountAmount > listTotal - 0.01` — `tests/unit/features/promotions/discount.test.ts`
- [x] P2.2 RED unit: `currencyFractionDigits(currency)`, `bonusSessions(def,bonus)`, `bonusPrice(bonoPrice, overridePrice|null)` — same file
- [x] P2.3 RED unit: `buildPackageSalePayload` + loose-session payload carry `list_total`/`discount_amount`/`discount_reason`/`discounted_by`; no discount → `list_total = total`, amount 0, reason/by null — `tests/unit/features/packages/build-package-sale-payload.test.ts`
- [x] P2.4 RED unit: `packages/schema.ts` superRefine — code XOR manual → "No se pueden combinar un código y un descuento manual."; manual `discount_amount > 0` ⇒ `discount_reason` required — `tests/unit/features/packages/schema.test.ts`
- [x] P2.5 RED integ: `sellPackage` + `sellLooseSession` persist discount fields; DB CHECK enforced end-to-end; `discounted_by` = acting staff — `tests/integration/promotions/sale-discount.test.ts`
- [x] P2.6 GREEN `src/features/promotions/domain/discount.ts` (pure, per contract)
- [x] P2.7 GREEN payload builders — `src/features/sales/domain/sell-package.ts` + loose-session request
- [x] P2.8 GREEN data fns — `sales` insert includes new columns
- [x] P2.9 GREEN `src/features/packages/schema.ts` superRefine additions (`discountKind`, `discountValue`, `discountReason`, `promotionId`)
- [x] P2.10 GREEN manual discount input block in `sell-package-form.tsx` + `sell-loose-session-form.tsx`
- [x] P2.11 GREEN `package-sale-actions.tsx` + loose action wire `discounted_by`
- [x] P2.12 GREEN display-only: `sales.ts` SELECT += `list_total, discount_amount, discount_reason, promotions(name), discount_codes(code)`; `sales/components/columns.tsx` struck `list_total` + `total` when `discount_amount > 0`; `ventas/[id]` Resumen adds "Precio de lista" (struck) + "Descuento" + promo/code label; `deriveSaleBalance` unchanged
- [x] P2.13 GREEN run `pnpm test` + golden path; confirm caja/KPI/balance assertions unchanged

## Phase P3: Discount codes at checkout (spec discount-codes)

- [x] P3.1 RED unit: `mapDiscountError` parses trigger message prefixes `discount_code_inactive` / `out_of_window` / `exhausted` / unknown → Spanish — `tests/unit/features/discount-codes/discount-error.test.ts`
- [x] P3.2 RED integ: `validateDiscountCode(supabase, code, businessDate)` → `{ok:true,row:{id,kind,value}}` or `{ok:false,reason:"unknown"|"inactive"|"out_of_window"|"exhausted"}` — `tests/integration/promotions/discount-codes.test.ts`
- [x] P3.3 RED integ: valid code at checkout → `used_count++` atomically; later void → decrement — same file
- [x] P3.4 RED unit: form schema rejects code + manual discount on the same sale (extend P2 rule with the `discountCode` field) — `tests/unit/features/packages/schema.test.ts`
- [x] P3.5 GREEN `src/features/discount-codes/data/discount-codes.ts` — `validateDiscountCode` advisory pre-check
- [x] P3.6 GREEN `src/features/promotions/domain/discount-error.ts` — `mapDiscountError`
- [x] P3.7 GREEN code input in `sell-package-form.tsx` + `sell-loose-session-form.tsx`; mutually exclusive with manual fields in the UI
- [x] P3.8 GREEN both actions resolve code → `discount_code_id`, compute `discount_amount` via `applyDiscount`, surface Spanish errors
- [x] P3.9 GREEN run `pnpm test`

## Phase P4: Combos & bonus sell path (spec promotions, service-catalog)

> P4a/P4b split trigger: at apply time, if P4 forecasts > 400 authored lines, ship P4a then P4b (bases: P4a→P3, P4b→P4a, P5→P4b).

### P4a — single-zone bonus
- [ ] P4a.1 RED unit: `bonusSessions(6,2) === 8`; `bonusPrice` = `override_price ?? bono_price`; no per-session price change — `tests/unit/features/promotions/bonus.test.ts`
- [ ] P4a.2 RED unit: `PackageSaleRequest.source = "promotion"` payload sets `promotion_id`, `total_sessions`, `total` — `tests/unit/features/packages/promotion-payload.test.ts`
- [ ] P4a.3 RED integ: bonus sell (2-insert path) → `sales` row with `promotion_id`, `client_package.total_sessions = default + bonus` — `tests/integration/promotions/bonus-sell.test.ts`
- [ ] P4a.4 GREEN bonus math + `source:"promotion"` payload in `sell-package.ts`
- [ ] P4a.5 GREEN bonus picker in `sell-package-form.tsx` (Vender paquete only; none on Sesión suelta)
- [ ] P4a.6 GREEN bonus action wiring; run `pnpm test`

### P4b — multi-zone combo
- [ ] P4b.1 RED unit: combo `list_total` = `sum(item.override_price ?? tariff.bono_price)` computed in the action — `tests/unit/features/packages/combo-payload.test.ts`
- [ ] P4b.2 RED integ: `sellCombo` → `create_combo_sale` RPC: 1 `sales` / N `client_packages` / N `sale_packages` / single `sale_balances`; combo MAY also carry a code or manual discount — `tests/integration/promotions/combo-sell.test.ts`
- [ ] P4b.3 GREEN `src/features/promotions/data/sell-combo.ts` — `sellCombo(...)` → `rpc("create_combo_sale")`
- [ ] P4b.4 GREEN multi-item combo picker in `sell-package-form.tsx`
- [ ] P4b.5 GREEN combo action builds `lines[]` + `list_total`, forwards optional discount
- [ ] P4b.6 GREEN run `pnpm test`; confirm P5 base is P4b

## Phase P5: `/configuracion/promociones` ABM (spec promotions)

- [ ] P5.1 RED unit: `promotionSchema` + `promotionUpdateSchema` — `name`, `kind in ('combo','bonus')`, `valid_from`/`valid_to` optional `date`, items `{tariffId, bonusSessions >= 0, overridePrice > 0 | null}`; update = full item-set replace — `tests/unit/features/promotions/schema.test.ts`
- [ ] P5.2 RED unit: `mapPromotionError` — 23505 / 23503 → Spanish — `tests/unit/features/promotions/promotion-errors.test.ts`
- [ ] P5.3 RED unit: list grouping + `?kind=` / `?archived=` filter helper — `tests/unit/features/promotions/promotion-list.test.ts`
- [ ] P5.4 GREEN `src/features/promotions/data/promotions.ts` — `list/get/create/update/archive/restore` (archive = `active=false`, no hard delete)
- [ ] P5.5 GREEN `src/features/promotions/schema.ts` + `src/features/promotions/domain/promotion-errors.ts`
- [ ] P5.6 GREEN actions `create-promocion` / `update-promocion` / `archive-promocion` — `"use server"`, zod re-parse, `revalidatePath('/configuracion/promociones')`, redirect on create/update
- [ ] P5.7 GREEN routes `configuracion/promociones/{page,nueva/page,[id]/editar/page}.tsx` — reads `?kind=&archived=` from `searchParams`
- [ ] P5.8 GREEN components `promotion-form` (items editor) / `promotion-list` / `promotion-columns` / `archive-promotion-button`
- [ ] P5.9 GREEN `configuracion/page.tsx` gains the "Promociones" Card; `src/components/nav-items.ts` UNCHANGED
- [ ] P5.10 GREEN run `pnpm test`

## Phase P6: `/configuracion/codigos` ABM (spec discount-codes)

- [ ] P6.1 RED unit: `discountCodeSchema` + `discountCodeUpdateSchema` — `code` citext, `kind percent|fixed`, `value > 0`, `max_uses > 0 | null`, `valid_from`/`valid_to` optional; once `used_count > 0` only `max_uses`/`valid_to`/`active` editable (`code`/`kind`/`value` locked) — `tests/unit/features/discount-codes/schema.test.ts`
- [ ] P6.2 RED unit: `mapDiscountCodeError` — 23505 (duplicate active `lower(code)`) / 23514 → Spanish — `tests/unit/features/discount-codes/errors.test.ts`
- [ ] P6.3 RED integ: `updateDiscountCode` after `used_count > 0` rejects `code`/`kind`/`value` change; `archiveDiscountCode` → `active=false`, row retained, `?archived=` filter — `tests/integration/promotions/discount-codes-abm.test.ts`
- [ ] P6.4 GREEN `src/features/discount-codes/data/discount-codes.ts` — `list/get/create/update/archive/restore`
- [ ] P6.5 GREEN `src/features/discount-codes/schema.ts` + `src/features/discount-codes/domain/errors.ts`
- [ ] P6.6 GREEN actions + routes `configuracion/codigos/{page,nueva/page,[id]/editar/page}.tsx` — `?archived=` filter
- [ ] P6.7 GREEN components `code-form` / `code-list` / `code-columns` / `archive-code-button`
- [ ] P6.8 GREEN `configuracion/page.tsx` gains the "Códigos de descuento" Card
- [ ] P6.9 GREEN run `pnpm test`

## Notes

- Slices are sequential: P2 needs P1's schema; P3 reuses P2's `applyDiscount` + schema; P4 needs the P1 RPC + P2 payloads; P5/P6 are additive ABM shells on top.
- Within a slice, RED tasks for independent invariants may be authored in parallel; GREEN migration/module tasks are single-writer.
- Ventas list/detail changes are display-only and land in P2 (struck `list_total` + discount label).
- `sale_balances` / `deriveSaleBalance` / caja theoretical / arqueo / dashboard KPI stay payment-driven — assert unchanged in P2 and P4.
- Open questions from design to confirm before P4: combo/bonus + code/manual on the same sale is allowed by design (encoded here); `updatePromotion` item editing is a full replace.
