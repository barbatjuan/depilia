# Exploration: promociones (promotions, per-sale discounts, discount codes)

> Mirror of Engram observation `sdd/promociones/explore` (#147). Artifact store: hybrid.

Base: feature-branch-chain off `catalogo-tarifas-pr-d` @ `c664ecb` (archived catalogo-tarifas). NEVER main.
Depends on specs: service-catalog, clinic-currency, cash-register.

## Objective (all 3 in scope, user-confirmed)
1. Promo packages/combos — multi-zone bundles, bonus sessions ("6+2"), seasonal % off a tariff; administered like tariffs, flagged promo, valid_from/valid_to.
2. Per-sale discount — at Vender paquete / Sesión suelta, % or fixed; sales records list_total vs total + discount_amount + reason/promotion_id.
3. Discount codes — coupon table (code, kind, value, max_uses, used_count, valid_to), entered at checkout, validated + usage-tracked, /configuracion/promociones ABM.

## Current State
- `sales` (0006): client_id RESTRICT, client_package_id UNIQUE 1:1 RESTRICT, appointment_id SET NULL, description, total numeric(12,2) check(total>0), sold_at, status in(open,void), CHECK package_xor_appointment. NO discount concept. total = price snapshot.
- `payments` (0006): sale_id RESTRICT, amount>0, paid_at, method in(cash,card,transfer,other). Trigger `payments_reject_overpayment` locks sale FOR UPDATE, rejects sum(amount)>total.
- Balance ALWAYS derived: view `sale_balances` (total - sum(payments)) + pure `deriveSaleBalance()` in src/features/sales/domain/sale-balance.ts. status unpaid|partial|paid.
- `client_packages` (0004): template_id SET NULL, zone_id snapshot RESTRICT, total_sessions>0, sessions_used. No expiry.
- `package_templates` (=tarifas after 0012): zone_id, name, gender(mujer|hombre), size_category(mini..cuerpo), default_sessions default 6, session_price>0, bono_price>0, active. PARTIAL unique index (zone_id,gender) where active. ABM = archive-never-delete.
- CAJA VERIFIED: `cash_session_theoretical` view + `cash_sessions_close_snapshot` trigger (0011) derive from actual cash payments + cash expenses + signed cash_movements — NEVER sales.total. So `total` IS the right field to record charged amount; discount lowers the payments cap; drawer only sees real cash. No caja ripple.
- Dashboard revenue KPI (src/features/dashboard/data/get-kpis.ts) = sum(payments.amount) monthly — payment-driven, no ripple.

## Sell flow (src/features/packages/)
- domain/sell-package.ts: buildPackageSalePayload (template -> {totalSessions:defaultSessions, price:bonoPrice, description}), buildLooseSessionPayload (tariff prefill, editable). No direct unit test on payload type.
- domain/tariff-picker.ts: filterTariffs, groupTariffsBySize, GENDER_LABEL/SIZE_LABEL/SIZE_ORDER.
- data/sell-package.ts: sellPackage = 2 sequential inserts (client_packages then sales total=price), NO txn (MVP tradeoff, orphan risk). sellLooseSession = one sales insert, no client_package_id.
- data/package-templates.ts: listActivePackageTemplates (active only), listActiveBodyZones.
- schema.ts: sellPackageSchema (template XOR custom via superRefine), sellLooseSessionSchema (templateId + editable amount). uses z.coerce.number.
- actions/{sell-package,sell-loose-session}.ts: .bind(null,clientId), re-parse, resolve tariff, reject archived, revalidatePath.
- components/{sell-package-form,sell-loose-session-form,package-sale-actions}.tsx: two <Sheet> slide-overs from client ficha, gender segmented control + grouped tariff <Select>.

## ABM template (src/features/settings/ tarifas; src/features/gastos categorias)
- data/tarifas.ts: listTariffs({gender?,sizeCategory?,includeArchived?}), getTariff, createTariff (resolve/create zone by name), updateTariff (size+prices only), archiveTariff (active=false), restoreTariff (23505 on collision). NO deleteTariff.
- schema.ts (zod), domain/tarifa-errors.ts (mapTarifaError 23505->Spanish).
- actions/{create,update,archive}-tarifa.ts: "use server", parse->data->revalidatePath+redirect.
- components/: tarifa-form, tarifa-list, tarifa-columns, archive-tarifa-button.
- routes: src/app/(dashboard)/configuracion/tarifas/{page,nueva/page,[id]/editar/page}.tsx; list reads ?gender=&archived= from searchParams. configuracion/page.tsx = one <Card> per ABM. nav-items.ts unchanged.
- categorias keeps full delete->archive-fallback (23503) because FK is RESTRICT.

## Migrations
Latest 0014. Next 0015. Dev allow-list `public.truncate_table` (redefined 0011) must list new tables. src/lib/supabase/types.ts generated — regen after migration.

## Candidate schema shapes
### A — Minimal: only sales.{list_total,discount_amount,discount_reason}; no tables; combos=ad-hoc; codes deferred. Low effort. REJECTED — under-scoped.
### B — One unified promotions(kind in combo|percent|fixed|code, value, code, max_uses, used_count, valid_from/to, active) + promotion_items; sales gets promotion_id. Medium. Sparse columns, mixed lifecycles, wide CHECK matrix. Workable but muddled.
### C (RECOMMENDED) — Separate tables:
```
promotions(id,name,kind in(combo,bonus,percent,fixed),percent null,fixed_amount null,valid_from date null,valid_to date null,active default true)
promotion_items(id,promotion_id ref promotions on delete cascade,tariff_id ref package_templates on delete restrict,bonus_sessions int default 0,override_price null; partial unique(promotion_id,tariff_id))
discount_codes(id,code citext,kind in(percent,fixed),value>0,max_uses int null,used_count int default 0 check>=0,valid_from/to date null,active default true; partial unique(lower(code)) where active; CHECK(max_uses is null or used_count<=max_uses))
sales ADD: list_total numeric(12,2) [backfill=total then NOT NULL], discount_amount numeric(12,2) not null default 0 check>=0, discount_reason text, promotion_id uuid ref promotions on delete set null, discount_code_id uuid ref discount_codes on delete set null, CHECK(total = list_total - discount_amount)
```
Code-usage guard: BEFORE INSERT ON sales trigger — when discount_code_id set, lock code FOR UPDATE, reject inactive/out-of-window/used_count>=max_uses, else used_count++ (mirrors payments_reject_overpayment).
Pros: clean non-sparse tables, ABMs match lifecycle, combos reuse tariffs ABM near-verbatim, slices split cleanly. Cons: two ABM route trees, two FKs on sales, overlap between "seasonal % off tariff" and per-sale discount (OQ4). Effort Medium-High but chunked.

## Migration/backfill
Prod has ZERO sales rows on unpushed chain — backfill academic but do it: list_total=total, discount_amount=0 before SET NOT NULL/CHECK. New tables get is_staff() RLS verbatim. Partial unique indexes. citext from 0001 or lower(code) functional index (project already does this for expense_categories). Extend truncate_table allow-list w/ promotions, promotion_items, discount_codes. Regen types.ts. No data migration for client_packages/payments/views.

## Ripple
- Sell: new pure domain/discount.ts (%/fixed math, clamp total>0, round to currency digits); payloads carry listTotal/discountAmount/discountReason/promotionId?/discountCodeId?; both data fns + both actions; actions resolve promo/code, validate window, map 23514/trigger errors to Spanish.
- COMBO CLASH: PackageSaleRequest gains source:"promotion". Multi-zone combo needs N client_packages but sales.client_package_id is UNIQUE 1:1 -> options (a) sale_packages join table (b) one sales row per combo line (c) multi-zone client_packages row (schema change). MUST decide in proposal (OQ1).
- Bonus "6+2": total_sessions = 6 + bonus_sessions, total = bono_price/override_price; single zone, no clash.
- Caja/arqueo: NO ripple (cash-flow derived). Dashboard KPI: NO ripple.
- Ventas list/detail (src/features/sales/data/sales.ts, ventas/[id]/page.tsx, sales/components/columns.tsx): display-only — show list_total struck + discount + promo/code label. deriveSaleBalance/sale_balances UNCHANGED.
- tests/integration/helpers/fixtures.ts + sell-package.test.ts: new columns. e2e/global-setup.ts + seed-demo.mjs: optional demo promo+code.

## ABM location
New feature dir src/features/promotions/ mirroring src/features/settings/ (data/, schema.ts, domain/*-errors.ts, actions/, components/). Routes src/app/(dashboard)/configuracion/promociones/{page,nueva/page,[id]/editar/page}.tsx (list ?kind=&archived=). Codes ABM: tab on promociones OR sibling /configuracion/codigos/** (recommend sibling for slice independence, OQ8). configuracion/page.tsx gains Card(s). nav-items.ts unchanged. Archive-only where FK is SET NULL, full delete->archive where RESTRICT.

## Recommended slice split — Feature Branch Chain off c664ecb
- P1 ~310 HIGH: 0015 migration (sales discount cols + backfill + CHECK; promotions/promotion_items/discount_codes + RLS + partial indexes + code-usage BEFORE INSERT trigger; truncate_table; types regen; integration tests CHECK/backfill/RLS/usage-race/window).
- P2 ~350 MED: per-sale discount — domain/discount.ts (pure, unit); payload builders; sellPackage/sellLooseSession; packages/schema.ts superRefine; discount UI both forms; package-sale-actions.tsx; unit+integration.
- P3 ~300 MED: discount codes — data/discount-codes.ts (validateCode, resolve at checkout); code input in both forms+actions; error mapping; usage-tracking integration.
- P4 ~380 HIGH: combos data model + sell path — source:"promotion" variant; client_package_id 1:1 resolution; bonus-session math; combo picker in sell-package-form.tsx. May split P4a (single-zone bonus) / P4b (multi-zone clash).
- P5 ~370 MED: /configuracion/promociones ABM (combos/seasonal) — src/features/promotions/** + 3 routes + form/list/columns/archive + error mapper + configuracion card + unit tests.
- P6 ~320 LOW: discount-codes ABM (/configuracion/codigos or promociones tab) — parallel data/schema/actions/components/routes for discount_codes.
types.ts generated — excluded from authored count.

## Review-budget risk: HIGH
Whole change ~2000 authored lines. Every slice kept <400 so NO size:exception needed — requires the 6-way split. Chained PRs REQUIRED not optional. P4 tightest; split P4a/P4b if it overflows.

## Risks
- sales.client_package_id UNIQUE 1:1 vs multi-zone combos — highest-uncertainty schema decision.
- Discount-code usage race — needs FOR UPDATE trigger; naive used_count++ in JS 2-insert would over-issue.
- Void/refund of discounted code-bearing sale — decrement used_count? void handling currently minimal.
- Overlap: "seasonal % off tariff" (kind1) vs per-sale discount (kind2) — two ways to do one thing.
- Rounding: % discounts round to currency digits (EUR 2) + clamp total>0; CHECK(discount_amount < list_total) would reject 100% discount — intended?
- buildPackageSalePayload has no direct unit test.
- 2-insert non-transactional sellPackage — combos multiply orphan window; consider RPC for combo path.

## Open Questions
1. Multi-zone combo vs client_package_id 1:1 — join table / per-line sale / multi-zone client_packages? (drives P1+P4)
2. Combo sale = one sales row (one balance/payment plan) or one per package?
3. Bonus "6+2": total_sessions override vs bonus_sessions column; per-session price change or free sessions?
4. "Seasonal % off a tariff" — promotions row or saved per-sale discount reason? Pick one.
5. Stacking/precedence — code + manual discount? code + combo price? Order of application?
6. Discount-code scope — global vs per-tariff/size/client/first-visit? (columns)
7. valid_from/valid_to — sale-time only or also on editing a sale? BA-day bounds or plain date?
8. Codes ABM — tab on /configuracion/promociones or sibling /configuracion/codigos? nav-items entry?
9. Rounding + clamp for %; is 100% discount (total=0 violates total>0) allowed, how modelled?
10. Void/refund — decrement used_count? restore promo availability? existing void flow to hook?
11. Do combos + codes apply to loose-session flow or only Vender paquete?
12. Audit — record discounted_by (staff id) on sales, like caja opened_by/created_by?

## Recommendation
Adopt Shape C + 6-slice chain off c664ecb. Money invariants in Postgres (CHECK + FOR UPDATE usage-guard trigger mirroring payments_reject_overpayment). Discount math pure in domain/discount.ts. sales.total = charged amount, list_total = pre-discount snapshot. Don't touch caja or balance views. Resolve OQ1 and OQ8 before P4/P6. Ready for sdd-propose pending the 12 answers.
