# Tasks: Catalogo de Tarifas

Hybrid store — Engram topic `sdd/catalogo-tarifas/tasks`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1869 authored — A1 ~302, A2 ~200, B ~322, C ~345, D1 ~370, D2 ~330 (generated `src/lib/supabase/types.ts` excluded) |
| 400-line budget risk | Medium — every slice is under 400, but A1, B, C, D1 are within ~30-80 lines of the cap |
| Chained PRs recommended | Yes |
| Suggested split | PR A1 → PR A2 → PR B → PR C → PR D1 → PR D2 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain off `caja-diaria-pr-c` (`527c7ea`), never `main` |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

PR #1 (A1) targets the tracker branch; each child PR targets its immediate predecessor (A2→A1, B→A2, C→B, D1→C, D2→D1). If a child diff shows a predecessor's changes, retarget/rebase before review. All six slices fit under 400 authored lines — verified against the design's slice table — so **no `size:exception` is required**. The 6-slice shape (A→A1/A2, D→D1/D2) exists precisely to avoid one.

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----|----------------------|-----------------|-------------------|
| A1 | `0012` schema rename + backfill + constraints + demo retirement + partial unique index + 4 harnesses | PR 1 (base: tracker) | `pnpm test tests/integration/catalog/schema.test.ts` | local `supabase start` + `pnpm test` golden path | drop partial index + 4 constraints, rename `bono_price`→`price`, drop 3 cols, un-archive 5 English zones |
| A2 | `0013` seed migration + guard block | PR 2 (base: A1) | `pnpm test tests/integration/catalog/seed.test.ts` | local Postgres | delete the 35 seeded zone names + their templates |
| B | `0014` currency + `money.ts` module + 13 call sites + async layout + e2e rewrite | PR 3 (base: A2) | `pnpm test tests/unit/lib/money.test.ts` | `pnpm test` + `pnpm playwright test e2e` | revert `money.ts` + 13 call sites; currency/locale columns inert if left |
| C | sales picker rework (`tariff-picker.ts`, both forms, both actions) | PR 4 (base: B) | `pnpm test tests/unit/features/packages` | golden path e2e | revert picker/domain; columns stay harmless |
| D1 | `/configuracion/tarifas` ABM (archive-only) | PR 5 (base: C) | `pnpm test tests/integration/catalog/tarifas.test.ts` | local Postgres + `pnpm test` | revert-only, additive |
| D2 | `/configuracion/zonas` ABM (full delete→archive) | PR 6 (base: D1) | `pnpm test tests/integration/catalog/zonas.test.ts` | local Postgres + `pnpm test` | revert-only, additive |

Strict TDD: a RED test precedes every GREEN task. SQL invariants are tested against real local Postgres, never mocked. `test_command = pnpm test`. Threat matrix is N/A per design (no routing/shell/subprocess/VCS/executable boundary); RLS is covered by integration denial tests.

## Phase A1: Migration `0012` schema + harnesses (spec service-catalog R1, R2, R6, R9)

- [x] A1.1 RED integ: preflight `do $$` raises (before any DDL) when a live row has `price <= 0` — `tests/integration/catalog/schema.test.ts` ("Preflight rejects non-positive price"). Covers design open risk: `session_price = round(price/6,2)` would be 0 and violate the new `> 0` CHECK.
- [x] A1.2 RED integ: `gender` / `size_category` enum CHECKs + `bono_price > 0` + `session_price > 0` reject bad rows — same file ("Enum and positive-price checks")
- [x] A1.3 RED integ: NOT NULL enforced on `gender` / `size_category` / `session_price` after backfill — same file ("NOT NULL post-backfill")
- [x] A1.4 RED integ: backfill values — legacy `price=30000` row → `bono_price=30000`, `mujer`, `mediana`, `session_price=5000.00` — same file ("Backfill values")
- [x] A1.5 RED integ: partial unique index — two active rows same `(zone_id, gender)` rejected (23505); archived + active pair allowed — same file ("Partial unique index (zone_id,gender) where active")
- [x] A1.6 RED integ: the 5 English demo zones become `archived=true` with `active=false` templates and disappear from `listActiveBodyZones` — same file ("English demo retirement")
- [x] A1.7 RED integ: RLS denial for non-staff JWT on `package_templates` and `body_zones` — same file ("Staff-only catalog access")
- [x] A1.8 GREEN `supabase/migrations/0012_service_catalog.sql` — ordered: (1) preflight `do $$`; (2) add nullable `gender`, `size_category`, `session_price`; (3) `rename column price to bono_price` — do NOT rename `package_templates_price_check`; (4) backfill via `coalesce`; (5) `set not null` on the three; (6) `drop constraint package_templates_price_check` **then** add `bono_price > 0`, `session_price > 0`, `gender in (...)`, `size_category in (...)`, `alter column default_sessions set default 6`; (7) retire the 5 English demo fixtures (deactivate templates, archive zones) **BEFORE** the index; (8) `create unique index package_templates_zone_gender_active_idx on package_templates (zone_id, gender) where active`
- [x] A1.9 GREEN regenerate `src/lib/supabase/types.ts`
- [x] A1.10 GREEN `src/features/packages/data/package-templates.ts` — select list + `price`→`bonoPrice` rename
- [x] A1.11 GREEN `src/features/sales/domain/sell-package.ts` — `price`→`bonoPrice` rename (compile-only in this slice)
- [x] A1.12 GREEN `tests/integration/helpers/fixtures.ts` — `seedPackageTemplate` params become `{ zone_id, name, gender, size_category, default_sessions, session_price, bono_price }`
- [x] A1.13 GREEN `tests/integration/sell-package.test.ts` — the `Axilas` fixture gains the new fields
- [x] A1.14 GREEN `scripts/seed-demo.mjs` — 5 English zones + `serviceSpecs` become real Spanish areas with new columns; `p.template.price` (sales total, ~line 247) → `p.template.bono_price`
- [x] A1.15 GREEN `e2e/global-setup.ts` — new constants (`E2E_CURRENCY="EUR"`, `E2E_LOCALE="es-ES"`, `E2E_PACKAGE_TEMPLATE_ZONE/NAME="Axilas"`, `_GENDER="mujer"`, `_SIZE="pequena"`, `_SESSIONS=6`, `_SESSION_PRICE=10`, `_BONO_PRICE=48`); `ensurePackageTemplate` upserts the real `Axilas` row after `resetDatabase`
- [x] A1.16 GREEN run `pnpm test` integration + golden path; confirm green on migrated schema

## Phase A2: Migration `0013` seed (spec service-catalog R3)

- [x] A2.1 RED integ: `0013` idempotent re-run — no duplicates, no error (`on conflict do nothing`) — `tests/integration/catalog/seed.test.ts` ("Idempotent re-run inserts zero additional rows")
- [x] A2.2 RED integ: gender-specific areas — `Ingles Completas` mujer-only, `Perfilado de barba` hombre-only — same file ("Gender-specific areas")
- [x] A2.3 RED integ: post-seed shape — 68 templates, 35 distinct zones, 0 duplicate `(area, gender)`, every seeded `default_sessions = 6` — same file ("Catalog size and shape"); also asserts size + gender distribution and a 7-row price spot-check ("Spot-check prices against the source price list")
- [x] A2.4 GREEN `supabase/migrations/0013_seed_service_catalog.sql` — `create temporary table catalog_seed(area, gender, size_category, session_price, bono_price)` (temp + explicit `drop table` — robust for the replay-in-transaction test); MINI + GRANDE via `unnest(array[...]) cross join (values ...)`; PEQUEÑA (10) / MEDIANA (26) / CUERPO (2) explicit; `do $$` transcription guard asserting 68 / 35 / 0-dupes / `bono_price >= session_price > 0`, raising before commit; then **3 SEPARATE statements** (not one CTE chain): `insert into body_zones select distinct area ... on conflict (name) do nothing`; `insert into package_templates ... from catalog_seed c join body_zones z on z.name = c.area ... on conflict (zone_id, gender) where active do nothing`; `drop table catalog_seed`
- [x] A2.5 GREEN run A2 tests against real local Postgres; confirm green

## Phase B: Migration `0014` + shared money formatter (spec clinic-currency R1–R6)

- [x] B.1 RED unit: `formatMoney` deterministic per explicit `(currency, locale)`, no hardcoded fallback — `tests/unit/lib/money.test.ts` ("formatMoney determinism")
- [x] B.2 RED unit: repo-guard — no `Intl.NumberFormat(…'ARS'…)` / `'es-AR'` literal survives outside `src/lib/money.ts` — `tests/unit/lib/no-hardcoded-currency.test.ts` ("No hardcoded currency literals")
- [x] B.3 RED integ: `clinic_settings.currency` default `'EUR'` + `locale` default `'es-ES'`; update persists (no amount conversion); RLS denial for non-staff — `tests/integration/catalog/clinic-currency.test.ts`
- [x] B.4 GREEN `supabase/migrations/0014_clinic_currency.sql` — `add column currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$')`, `add column locale text not null default 'es-ES'`
- [x] B.5 GREEN `src/lib/money.ts` — pure: `MoneyFormat`, `DEFAULT_MONEY_FORMAT`, `formatMoney`, `moneyFormatter` (memoized by `${locale}|${currency}`); currency-default fraction digits, drop `maximumFractionDigits: 0`
- [x] B.6 GREEN `src/features/settings/data/money-format.ts` — `getMoneyFormat` via React `cache()`, one query/request, falls back to `DEFAULT_MONEY_FORMAT` when the clinic_settings row is missing
- [x] B.7 GREEN `src/components/money-format-provider.tsx` — `"use client"` `MoneyFormatProvider` + `useMoneyFormat`
- [x] B.8 GREEN `src/components/money-cell.tsx` — `"use client"` `MoneyCell` for TanStack column `cell` closures
- [x] B.9 GREEN `src/app/(dashboard)/layout.tsx` — convert to `async`, mount `MoneyFormatProvider` for the authenticated shell
- [x] B.10 GREEN 5 client call sites via `useMoneyFormat()` — `cash/components/{close-session-form,movement-table,arqueo-badge,today-cash-payments,session-summary-card}.tsx`
- [x] B.11 GREEN 2 column-def sites via `<MoneyCell>` — `sales/components/columns.tsx`, `expenses/components/columns.tsx`
- [x] B.12 GREEN 4 RSC sites via `await getMoneyFormat(supabase)` + `formatMoney` — `app/(dashboard)/dashboard/page.tsx`, `gastos/page.tsx`, `clientes/[id]/page.tsx`, `ventas/[id]/page.tsx`
- [x] B.13 GREEN `e2e/money.ts` shared helper; rewrite money assertions in `e2e/golden-path.spec.ts` ("6 de 6 sesiones restantes", "5 de 6", payment `29`, remaining `"19,00 €"`, `^Paquete Axilas`) and `e2e/caja.spec.ts` (exact `formatMoney(shortfall, {EUR, es-ES})` string, replacing the `\$`-anchored regex)
- [x] B.14 GREEN run `pnpm test` + `pnpm playwright test e2e`; confirm golden path + caja green

## Phase C: Sales picker rework (spec service-catalog R7, R8)

- [ ] C.1 RED unit: `buildPackageSalePayload` — `bonoPrice` → `sales.total`, `defaultSessions` (6) → `total_sessions` — `tests/unit/features/packages/build-package-sale-payload.test.ts`
- [ ] C.2 RED unit: loose-session payload — `price` prefilled from `sessionPrice` kept vs operator-overridden — `tests/unit/features/packages/loose-session-payload.test.ts`
- [ ] C.3 RED unit: `filterTariffs(all, {gender, sizeCategory?})` + `groupTariffsBySize` — `tests/unit/features/packages/tariff-picker.test.ts`
- [ ] C.4 GREEN `src/features/packages/domain/tariff-picker.ts` — `GENDER_LABEL`, `SIZE_LABEL`, `SIZE_ORDER`, `filterTariffs`, `groupTariffsBySize`
- [ ] C.5 GREEN `src/features/sales/domain/sell-package.ts` — `PackageTemplateOption` gains `gender`, `sizeCategory`, `sessionPrice`, renames `price`→`bonoPrice`; `buildPackageSalePayload` maps `totalSessions = defaultSessions`, `price = bonoPrice`; `LooseSessionRequest` gains `templateId: string | null`
- [ ] C.6 GREEN `listActivePackageTemplates` select → `"id, zone_id, name, gender, size_category, default_sessions, session_price, bono_price, body_zones(name)"`
- [ ] C.7 GREEN `sell-package-form.tsx` — gender segmented control (default `mujer`) above the Select; options grouped by `SIZE_ORDER` with SelectGroup/SelectLabel; item label `{name} — bono 6 sesiones ({formatMoney(bonoPrice)})`; changing gender resets selection; keep "Personalizado" branch verbatim
- [ ] C.8 GREEN `sell-loose-session-form.tsx` — replace `zones` Select with gender filter + tariff Select; selecting a tariff sets the controlled `price` input to `sessionPrice`, field stays editable
- [ ] C.9 GREEN `sellLooseSessionSchema` gains `templateId: uuid`, drops standalone `zoneId`; `sellLooseSessionAction` resolves via `listActivePackageTemplates`, rejects an archived tariff, falls back to `template.sessionPrice` on a blank price
- [ ] C.10 GREEN `PackageSaleActions` passes `templates` to both sheets; `zones` remains only for the custom package branch
- [ ] C.11 GREEN run `pnpm test tests/unit/features/packages` + golden path

## Phase D1: `/configuracion/tarifas` ABM — archive-only (spec service-catalog R4, R6)

- [ ] D1.1 RED unit: `tariffSchema` — `zoneId`, `name`, `gender` enum, `sizeCategory` enum, `defaultSessions` int `>0` default 6, `sessionPrice > 0`, `bonoPrice > 0` — `tests/unit/features/settings/tariff-schema.test.ts`
- [ ] D1.2 RED integ: `createTariff` → `active=true`, `default_sessions=6`; `archiveTariff` sets `active=false`, row retained, dropped from default list; 23505 → "Ya existe una tarifa activa para esa zona y género." — `tests/integration/catalog/tarifas.test.ts`
- [ ] D1.3 RED integ: deleting a template → `client_packages` row survives with `template_id = NULL` (ON DELETE SET NULL) — same file ("template_id SET NULL")
- [ ] D1.4 GREEN `src/features/settings/data/tarifas.ts` — `TariffRow`, `listTariffs(s, {gender?, sizeCategory?, includeArchived?})`, `getTariff`, `createTariff`, `updateTariff`, `archiveTariff` (`active=false`), `restoreTariff`. **No `deleteTariff`** (design decision 8 — `template_id` is SET NULL, a delete would silently orphan history)
- [ ] D1.5 GREEN `src/features/settings/schema.ts` `tariffSchema`; `src/features/settings/domain/tariff-errors.ts` maps 23505
- [ ] D1.6 GREEN actions `create` / `update` / `archive` tariff — `"use server"`, zod re-parse, `revalidatePath`
- [ ] D1.7 GREEN routes `configuracion/tarifas/{page,nueva/page,[id]/editar/page}.tsx` mirroring `/configuracion/categorias` file-for-file; list page reads `?gender=&size=` from `searchParams`
- [ ] D1.8 GREEN 4 components: tariff list / table / form / gender+size filters
- [ ] D1.9 GREEN `configuracion/page.tsx` gains the tarifas card; `src/components/nav-items.ts` UNCHANGED
- [ ] D1.10 GREEN run `pnpm test`

## Phase D2: `/configuracion/zonas` ABM — full delete→archive (spec service-catalog R5)

- [ ] D2.1 RED unit: `bodyZoneSchema` (name only) — `tests/unit/features/settings/zone-schema.test.ts`
- [ ] D2.2 RED integ: `createBodyZone` / `archiveBodyZone`; `deleteBodyZone` hits RESTRICT → 23503 → archive fallback; archived zone excluded from active pickers — `tests/integration/catalog/zonas.test.ts`
- [ ] D2.3 GREEN `src/features/settings/data/zonas.ts` — full categorias parity: `listBodyZones`, `getBodyZone`, `createBodyZone`, `updateBodyZone`, `archiveBodyZone`, `deleteBodyZone` (RESTRICT → 23503 → archive fallback)
- [ ] D2.4 GREEN `src/features/settings/schema.ts` `bodyZoneSchema`; `src/features/settings/domain/zone-delete-errors.ts`
- [ ] D2.5 GREEN actions `create` / `update` / `archive` / `delete` zone — `"use server"`, zod re-parse, `revalidatePath`
- [ ] D2.6 GREEN routes `configuracion/zonas/{page,nueva/page,[id]/editar/page}.tsx` mirroring categorias
- [ ] D2.7 GREEN 4 components; `configuracion/page.tsx` gains the zonas card
- [ ] D2.8 GREEN run `pnpm test`

## Notes

- Slices are sequential: A2 imports A1's schema; B's e2e rewrite assumes A1's renamed constants; C imports B's `formatMoney` and A1's renamed domain; D1/D2 are additive on top of C.
- Within a slice, RED tasks for independent invariants may be written in parallel; GREEN migration/module tasks are single-writer.
- Open design questions to confirm before A2 lands: MEDIANA's 26 explicit rows vs source photos; booking zone dropdown growing 5→35 with no gender context; whether `seed-demo.mjs` should sample the seeded real catalog.
