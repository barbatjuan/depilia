# Apply Progress: promociones

Hybrid store — Engram topic `sdd/promociones/apply-progress`.

## Slice P1 — Migration `0015` + triggers + combo RPC — DONE

Branch `promociones-pr-p1` (off tracker `promociones` @ `c664ecb`). Strict TDD.
All 13 P1 tasks complete. `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e`
green: 64 test files / 298 tests (273 pre-existing + 25 new), 5 e2e.

### Files changed

| File | Action | What |
|------|--------|------|
| `supabase/migrations/0015_promotions.sql` | Created | citext ext; `promotions`, `promotion_items`, `discount_codes`, `sale_packages`; `sales` +6 cols + backfill + `sales_money_identity` + `sales_list_total_present` CHECKs; `is_staff()` RLS on 4 tables; partial unique indexes; `sales_set_list_total_default` BEFORE INSERT; `sales_apply_discount_code` BEFORE INSERT (FOR UPDATE); `sales_release_discount_code` AFTER UPDATE; `create_combo_sale(...)` SECURITY DEFINER RPC (revoked from public/anon, granted authenticated); `truncate_table` allow-list += 4 tables |
| `src/lib/supabase/types.ts` | Regenerated | `supabase gen types typescript --local` after `0015` |
| `tests/integration/helpers/fixtures.ts` | Modified | `resetDatabase` += 4 tables; `seedPromotion`, `seedPromotionItem`, `seedDiscountCode` |
| `tests/integration/promotions/schema.test.ts` | Created | money identity, negative discount, comped reject, 0.01 floor, backfill, list_total presence, partial unique indexes, discount_codes/promotion_items CHECKs, RESTRICT/CASCADE |
| `tests/integration/promotions/discount-codes.test.ts` | Created | concurrent max_uses=1 exactly-one, exhausted, inactive, BA-date window in/out, void decrement floor-0, non-code void no-op |
| `tests/integration/promotions/combo-sell.test.ts` | Created | 1 sale + N packages + N join + single sale_balances; atomic rollback on bad line; extra discount on combo |
| `tests/integration/promotions/rls.test.ts` | Created | non-staff JWT gets `[]` + write denied on all 4 tables |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| P1.1 | `promotions/schema.test.ts` | Integration | N/A (new) | ✅ 25 failing (no schema) | ✅ 5 cases pass | ✅ mismatch/ok/neg/comped/floor | ➖ |
| P1.2 | `promotions/schema.test.ts` | Integration | N/A (new) | ✅ | ✅ | ✅ backfill + presence-CHECK + trigger NULL rewrite | ➖ |
| P1.3 | `promotions/rls.test.ts` | Integration | N/A (new) | ✅ | ✅ | ✅ 4 tables read + 2 write denials | ➖ |
| P1.4 | `promotions/discount-codes.test.ts` | Integration | N/A (new) | ✅ | ✅ exactly-one of 2 concurrent | ✅ + exhausted follow-up | ➖ |
| P1.5 | `promotions/discount-codes.test.ts` | Integration | N/A (new) | ✅ | ✅ | ✅ out-of-window reject + in-window increment | ➖ |
| P1.6 | `promotions/discount-codes.test.ts` | Integration | N/A (new) | ✅ | ✅ | ✅ decrement + double-void floor 0 + non-code no-op | ➖ |
| P1.7 | `promotions/combo-sell.test.ts` | Integration | N/A (new) | ✅ | ✅ | ✅ happy + atomic rollback + discount-on-top | ➖ |
| P1.8 | `promotions/schema.test.ts` | Integration | N/A (new) | ✅ | ✅ | ✅ 3 unique indexes incl. archived-dup allowed | ➖ |
| P1.9 | `promotions/schema.test.ts` | Integration | N/A (new) | ✅ | ✅ | ✅ value/max_uses/cap + bonus_sessions/override_price | ➖ |
| P1.10 | migration | — | full `supabase db reset` chain 0001→0015 clean | ✅ | ✅ | ➖ structural | ✅ ordered per design |
| P1.11 | types.ts | — | `pnpm typecheck` clean | ✅ | ✅ | ➖ | ➖ |
| P1.12 | fixtures.ts | — | pre-existing integration suite green | ✅ | ✅ | ➖ | ➖ |
| P1.13 | full suite | Unit+Integration+E2E | 273 unit/integ + 5 e2e baseline | ✅ | ✅ 298 + 5 | ➖ | ➖ |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command / result | `pnpm vitest run --project integration tests/integration/promotions/` → 4 files, 25 passed |
| Runtime harness / result | `supabase db reset --local` (0001→0015) + `pnpm test` (298 passed) + `pnpm e2e` (5 passed) |
| Rollback boundary | Delete `0015_promotions.sql` + `tests/integration/promotions/**`; revert `fixtures.ts` + `types.ts`; `supabase db reset`. Prod has 0 sales rows so backfill is a no-op. |

### Deviations from design

1. **citext**: design said "citext from 0001" but no prior migration enabled it. `0015` now runs `create extension if not exists citext with schema extensions;` and types `code extensions.citext`.
2. **`list_total` presence via CHECK, not `SET NOT NULL`**: a `CHECK (list_total is not null)` (`sales_list_total_present`) plus the `sales_set_list_total_default` BEFORE INSERT trigger keeps every pre-P2 `sales` insert site compiling untouched (generated Insert type keeps `list_total` optional). Functionally equivalent to NOT NULL — no row can be inserted without it.
3. **New `sales_set_list_total_default` BEFORE INSERT trigger** (not in design): fills `list_total := total` when the caller omits it. Needed because P1 must not touch sell flows yet existing inserts don't pass `list_total`.
4. **RPC nullable params get `DEFAULT NULL`** (`p_discount_reason`, `p_discount_code_id`, `p_discounted_by`, `p_lines DEFAULT '[]'::jsonb`) so `supabase gen types` marks them optional. Signature unchanged; revoke/grant still match.
5. **`promotions` / `discount_codes` carry `updated_at`** (design listed "timestamps") — for the P5/P6 ABM edit flows.

### Open questions (unchanged, for later slices)

- combo/bonus + code/manual on same sale: DB accepts it uniformly (only code-XOR-manual is app-enforced). Confirmed by `combo-sell` "extra discount on top" test.
- `updateDiscountCode` immutability after use — P6.
- `updatePromotion` full item replace — P5.

## Slice P2 — Pure discount math + per-sale manual discount — IMPLEMENTED (NOT COMMITTED — over budget)

Branch `promociones-pr-p2` (off `promociones-pr-p1` @ `de77b9b`). Strict TDD.
All 13 P2 tasks implemented and green: `pnpm lint` ✓, `pnpm typecheck` ✓,
`pnpm test` → 67 files / **327 passed** (298 P1 baseline + 29 new), `pnpm e2e` → **5 passed**.

**Budget flag**: authored production diff is **594+ / 44- = 638 changed lines**
(tests +436/-4 on top). The tasks.md forecast was ~360; actual is ~1.6× the
400-line PR cap. Work is left in the tree UNCOMMITTED pending a delivery
decision (accept `size:exception`, or split P2a = math+payload+schema+data+
integration / P2b = forms + ventas display). `src/lib/supabase/types.ts`
untouched (no regen needed).

### Files changed

| File | Action | What |
|------|--------|------|
| `src/features/promotions/domain/discount.ts` | Created | `applyDiscount` (discriminated `{ok:false,reason:"exceeds"\|"invalid"}`), `currencyFractionDigits` (CLDR zero-decimal set — no `Intl` currency instance, satisfies the `no-hardcoded-currency` guard), `bonusSessions`, `bonusPrice` |
| `src/features/promotions/domain/discount-errors.ts` | Created | `mapDiscountError` — Postgres `23514` → Spanish (P3 extends with trigger prefixes) |
| `src/features/packages/domain/sell-package.ts` | Modified | `SaleDiscountInput`, `resolveSaleDiscount` (pure), both builders accept optional `discount` and fold `listTotal`/`total`/`discountAmount`/`discountReason`/`discountedBy` into the payload |
| `src/features/packages/data/sell-package.ts` | Modified | `saleDiscountColumns()` maps payload discount fields onto the `sales` columns; no-discount falls back to `list_total = price`, `discount_amount = 0` |
| `src/features/packages/data/sale-discount.ts` | Created | `resolveDiscountInput` — resolves `discounted_by` via `supabase.rpc("current_staff_id")` (same source as caja `opened_by`), fraction digits from `getMoneyFormat` |
| `src/features/packages/schema.ts` | Modified | shared `discountFields` + `refineManualDiscount` superRefine on both schemas (reason required, percent 0<v≤100, fixed v>0); comment marks the P3 code-XOR slot |
| `src/features/packages/actions/{sell-package,sell-loose-session}.ts` | Modified | parse discount fields, resolve discount input, surface `resolveSaleDiscount` Spanish throws, map `23514` via `mapDiscountError` |
| `src/features/packages/components/manual-discount-fields.tsx` | Created | shared kind toggle (%/fijo) + amount + reason block; structural note for P3 code exclusivity |
| `src/features/packages/components/{sell-package-form,sell-loose-session-form}.tsx` | Modified | render `<ManualDiscountFields />` |
| `src/features/sales/data/sales.ts` | Modified | SELECT += `list_total, discount_amount, discount_reason, promotions(name), discount_codes(code)`; `SaleDiscountInfo` on `SaleListRow` + `SaleDetail`; `deriveSaleBalance` untouched |
| `src/features/sales/components/columns.tsx` | Modified | Total cell shows struck `listTotal` + charged `total` when `discountAmount > 0` |
| `src/app/(dashboard)/ventas/[id]/page.tsx` | Modified | Resumen adds struck "Precio de lista" + "Descuento" + promo/code · reason label |

### TDD Cycle Evidence

| Task | Test File | Layer | RED | GREEN | REFACTOR |
|------|-----------|-------|-----|-------|----------|
| P2.1 `applyDiscount` | `unit/features/promotions/discount.test.ts` | Unit | ✅ import missing | ✅ 8 cases | ➖ |
| P2.2 fraction digits / bonus math | same | Unit | ✅ | ✅ 4 cases | ✅ swapped `Intl` currency instance → CLDR set to pass `no-hardcoded-currency` guard |
| P2.3 payload builders | `unit/features/packages/build-package-sale-payload.test.ts` | Unit | ✅ new fields absent | ✅ 6 cases | ✅ existing payload tests → `toMatchObject` |
| P2.4 schema superRefine | `unit/features/packages/schema.test.ts` (+7) | Unit | ✅ | ✅ | ➖ |
| P2.5 persist + non-ripple | `integration/promotions/sale-discount.test.ts` | Integration | ✅ | ✅ 4 cases (persist, defaults, `23514` reject, `sale_balances`/KPI unchanged) | ➖ |
| P2.6–P2.12 GREEN | — | — | — | ✅ lint/typecheck/test/e2e | ➖ |
| P2.13 full suite | `pnpm test` + `pnpm e2e` | all | 298+5 baseline | ✅ 327 + 5 | ➖ |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command / result | `pnpm vitest run tests/unit/features/promotions/ tests/unit/features/packages/ tests/integration/promotions/` → all pass (66 unit + 31 integration) |
| Runtime harness / result | `pnpm test` → 327 passed; `pnpm e2e` → 5 passed (run serially — concurrent runs corrupt the shared local DB) |
| Rollback boundary | Delete `src/features/promotions/**`, `src/features/packages/{components/manual-discount-fields,data/sale-discount}.ts`, `tests/**/promotions/discount*.test.ts`, `tests/integration/promotions/sale-discount.test.ts`, `tests/unit/features/packages/build-package-sale-payload.test.ts`; revert the 11 modified files. `discount_amount` stays 0 and `list_total = total` for every sale. |

### Deviations from design

1. `currencyFractionDigits` uses an explicit CLDR zero-decimal currency set instead of an `Intl.NumberFormat` currency instance — the repo's `no-hardcoded-currency` guard forbids a currency-bearing `Intl.NumberFormat` outside `src/lib/money.ts`.
2. `applyDiscount` reason is `"exceeds" | "invalid"` (design) — `"invalid"` covers non-positive value, percent > 100, and negative computed amount.
3. `discounted_by` resolved in the data/action layer via `rpc("current_staff_id")` rather than a column `DEFAULT` — a default would stamp every non-discounted sale too, violating the spec's "no discount ⇒ by null".
4. Payload discount fields are optional on `PackageSalePayload` / `LooseSessionPayload` so hand-built payloads in existing tests still typecheck; the builders always populate them.

## Remaining slices

- [~] P2 sale-discounts — implemented, uncommitted, awaiting over-budget delivery decision
- [ ] P3 discount-codes checkout (targets P2)
- [ ] P4 / P4a+P4b combos sell
- [ ] P5 promociones ABM
- [ ] P6 codigos ABM
