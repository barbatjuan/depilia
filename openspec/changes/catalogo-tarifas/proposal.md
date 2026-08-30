# Proposal: Catalogo de Tarifas

## Intent

The clinic's real price list (sinvello, EUR) lives on paper. `package_templates` is empty in production, has no gender, no size grouping, and only one price — so the sale price of a single session is typed by hand every time, and there is no way to manage the catalog from the app. Staff cannot sell what the clinic actually offers. This change loads the real catalog (~42 areas, ~78 tariffs), gives it the shape the price list already has (gender x size x session/bono), and puts it under staff control.

## Scope

### In Scope

- `package_templates`: add `gender` ('mujer','hombre'), `size_category` ('mini','pequena','mediana','grande','cuerpo'), `session_price`; rename `price` -> `bono_price`; `unique(zone_id, gender)`; keep `default_sessions` (6).
- Backfill the ~6 live rows (`mujer`/`mediana`/`bono_price/6`), then NOT NULL and drop the column default.
- Seed the real catalog in migration `0012` (`on conflict do nothing`); retire the 5 English demo zones from `scripts/seed-demo.mjs` and `e2e/global-setup.ts`.
- `clinic_settings.currency` + locale, default `EUR`; one shared money-format module replacing 11 hardcoded `es-AR`/`ARS` formatters.
- Sales: "Vender paquete" always sells the bono (6 x `bono_price`); the loose-session flow picks a tariff and prefills an editable `session_price`.
- ABM `/configuracion/tarifas` (filter by gender + size, archive via `active=false`) and minimal `/configuracion/zonas`; cards in `/configuracion`.

### Out of Scope

- Multi-currency (one clinic-wide setting) and FX conversion.
- Price history / versioning; per-client discounts or promotions.
- Gender awareness in the booking flow (the zone dropdown just grows).

## Capabilities

### New Capabilities

- `service-catalog`: body zones and gendered, size-grouped tariffs with session and bono pricing; catalog management and tariff-driven selling.
- `clinic-currency`: a single clinic currency/locale setting that governs every money display.

### Modified Capabilities

- None. `cash-register` states no currency requirement; sales and packages have no existing spec, so their new behavior lands in `service-catalog`.

## Approach

Exploration Option 1: extend `package_templates` in place rather than normalize `size_category` onto `body_zones` or introduce a parallel `service_catalog` table. One zone row per area, one template row per (zone, gender). `client_packages.template_id` is `ON DELETE SET NULL` and `sales.total` already snapshots price, so history is untouched and templates are archived, never deleted. The seed ships in the migration because 78 rows are not an ABM task; the ABM and the seed are the guardrails against `size_category` drift.

Deliver as a chained slice set off `caja-diaria-pr-c` (`527c7ea`); there is no `main`.

| Slice | Contents | Est. |
|---|---|---|
| A | `0012` (columns + rename + backfill + catalog seed), regen `types.ts`, thread through data/domain/seed/e2e/fixtures, integration tests | ~380 |
| B | `clinic_settings.currency` + shared money module + 11 formatter call sites + e2e assertion updates | ~260 |
| C | Sales picker rework: gender filter, bono vs loose-with-tariff, payload builders, unit tests | ~220 |
| D | `/configuracion/tarifas` + `/configuracion/zonas` ABM + cards | ~350 |

A -> B -> C -> D. Currency is split out of A (exploration folded it in) because it alone touches 11 files and two verified E2E assertions; keeping it separate keeps every slice near budget and makes the golden-path break isolable.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `supabase/migrations/0012_*.sql` | New | Columns, rename, backfill, `currency`, catalog seed |
| `src/lib/supabase/types.ts` | Modified | Regenerate after `0012` |
| `src/lib/money.ts` | New | Shared setting-driven formatter |
| `src/features/packages/{data,domain,components,actions}` | Modified | New fields, gender filter, bono vs loose |
| 11 currency call sites (`cash`, `expenses`, `sales`, dashboard, `ventas/[id]`, `clientes/[id]`) | Modified | Use the shared formatter |
| `scripts/seed-demo.mjs`, `e2e/global-setup.ts`, `tests/integration/helpers/fixtures.ts` | Modified | New NOT NULL fields, real Spanish zone |
| `e2e/golden-path.spec.ts`, `e2e/caja.spec.ts` | Modified | `currency: "ARS"` and the `\$` assertion |
| `src/app/(dashboard)/configuracion/**` | New/Modified | `tarifas/`, `zonas/`, two cards |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `price` -> `bono_price` breaks Supabase string selects at runtime, not compile time | High | Regen types, full grep sweep, run integration + e2e inside slice A |
| Currency switch breaks the verified golden path (`currency: "ARS"`, `\$` regex) | High | Isolated in slice B; update both assertions with the change |
| The ~78 EUR prices are transcribed from photos | Medium | Confirmed authoritative by the user; ABM makes any correction a 30-second edit |
| `size_category` drift between an area's two gender rows | Medium | ABM groups by size; seed is the source of truth |
| `unique(zone_id, gender)` rejects a future second tariff for one area/gender | Low | Holds for the current list; Ingles variants are distinct areas |

## Rollback Plan

Per slice, in reverse. D and C are revert-only (no schema). B: revert the module and call sites; `clinic_settings.currency` is additive and harmless if left. A: `alter table package_templates rename column bono_price to price`, drop `gender`/`size_category`/`session_price`, delete the seeded rows by name. `client_packages` and `sales` need no rollback — `template_id` is `SET NULL` and price is already snapshotted.

## Dependencies

- Branches off `caja-diaria-pr-c` (`527c7ea`).
- Real price data: Engram `depilia/catalogo-tarifas-data` (#118) is the authoritative content for the seed.

## Success Criteria

- [ ] A logged-in staff member can sell any of the ~78 real tariffs without typing a price.
- [ ] Selling a bono creates a 6-session package at `bono_price`; a loose session prefills `session_price` and stays editable.
- [ ] Every money value in the app renders in the currency configured in `clinic_settings`.
- [ ] Tariffs and zones can be created, edited, and archived from `/configuracion` with no SQL.
- [ ] The existing E2E golden path passes on the new schema and the new currency.
