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

## Remaining slices

- [ ] P2 sale-discounts (targets P1)
- [ ] P3 discount-codes checkout (targets P2)
- [ ] P4 / P4a+P4b combos sell
- [ ] P5 promociones ABM
- [ ] P6 codigos ABM
