# Exploration: catalogo-tarifas

> Mirror of Engram observation `sdd/catalogo-tarifas/explore` (#124). Artifact store: hybrid.
> Real price data: Engram #118 (`depilia/catalogo-tarifas-data`).

## Current State
- `package_templates(id, zone_id → body_zones ON DELETE RESTRICT, name, default_sessions int >0, price numeric(12,2) >=0, active bool)` — `0003_catalog.sql`, RLS `is_staff()`.
- `body_zones(id, name text unique, archived bool)` — name only. `0010_seed_dev.sql` seeds 5 English demo zones (underarms/legs/bikini/face/back) + expense_categories + clinic_settings; does NOT seed `package_templates`. Real/prod `package_templates` is EMPTY; rows come only from `scripts/seed-demo.mjs` (dev), `e2e/global-setup.ts` (idempotent "E2E Golden Path Package", zone "legs"), integration fixtures.
- Consumers: `src/features/packages/data/package-templates.ts` `listActivePackageTemplates` (string select `id, zone_id, name, default_sessions, price, body_zones(name)`) → `PackageTemplateOption` → `buildPackageSalePayload` (`domain/sell-package.ts`: defaultSessions→`client_packages.total_sessions`, price→`sales.total`) → one FLAT `<Select>` in `sell-package-form.tsx` + a "Personalizado" branch. `client_packages.template_id` is `ON DELETE SET NULL`; `sales.total` snapshots price.
- Booking (`src/features/appointments/`) does NOT read `package_templates` — uses `listActiveBodyZones` (id+name). Gender/size/price changes don't couple into booking; only the zone list grows 5 → ~42.
- `src/lib/supabase/types.ts` generated — regenerate after any migration.
- Only ABM that exists: `/configuracion/categorias` (expense categories) — a complete copy-paste template (page + nueva + [id]/editar + data + actions + table/columns + schema + RESTRICT→Spanish mapper). `/configuracion/page.tsx` is a hand-maintained card list. Next migration: `0012`.
- Money formatted es-AR; #118 prices are EUR; `clinic_settings` has an unused `timezone` col, no currency col.

## The data (#118)
Two sheets Mujer / Hombre. Section headers = size categories MINI / PEQUEÑA / MEDIANA / GRANDE / CUERPO. Each row = area + SESIÓN price + BONO price; every bono = 6 sessions. ~40 mujer + ~38 hombre ≈ 78 template rows over ~42 distinct areas. Most areas shared across genders at different prices. Gender-specific: "Ingles Completas" (mujer only), "Perfilado de barba" (hombre only). Ingles Normales/Brasileñas/Completas are distinct area names.

## Approaches (schema shape)
1. **Columns on `package_templates` only (user's stated decision)** — add `gender` CHECK ('mujer','hombre'), `size_category` CHECK ('mini','pequena','mediana','grande','cuerpo'), `session_price numeric(12,2)`, rename `price`→`bono_price`, add `unique(zone_id, gender)`. `body_zones` stays name-only; one zone per area, two templates for shared areas. Pros: smallest migration, one ABM, booking untouched, sales/client_packages unaffected. Cons: `size_category` duplicated across the two gender rows (drift risk); ~42 new zones beside the 5 demo ones; 5-6 live rows need backfill. Effort: Medium.
2. **Normalize `size_category` onto `body_zones`**; templates get `gender`/`session_price`/`bono_price` only. Pros: size in one place. Cons: two-table migration, two ABMs. Effort: Medium-High.
3. **New `service_catalog` table** — breaks `client_packages.template_id` FK + sell-package flow. Rejected.

## Migration / backfill
Add 3 columns + `rename column price to bono_price`; backfill existing rows (`gender='mujer'`, `size_category='mediana'`, `session_price=round(bono_price/6,2)`), set NOT NULL, drop default. Seed the real catalog IN `0012` (`on conflict do nothing`, like `0010`): ~42 `body_zones` + ~78 `package_templates`. Update `seed-demo.mjs` + `e2e/global-setup.ts` + `fixtures.ts` + `tests/integration/sell-package.test.ts` in the SAME slice or the golden path / integration suite break (string selects fail at runtime). `client_packages`/`sales` need no backfill. Keep `default_sessions` (default 6).

## Ripple into UIs
- **Sales**: flat `<Select>` becomes ~78 items → needs a `gender` filter + size grouping; `PackageTemplateOption` + `buildPackageSalePayload` gain new fields. Open: is a "package" sale always the 6-session bono? Should loose-session sales prefill `session_price`?
- **Booking**: no schema coupling; the zone dropdown grows and some zones become gender-specific with no gender context (cosmetic).

## Where the ABM lives
New `/configuracion/tarifas` mirroring `/configuracion/categorias` (`src/features/packages/{data,actions,components}` + schema + nueva/[id]/editar + a card in `configuracion/page.tsx`), filtered by gender+size via DataTable searchParams. Template "delete" is not FK-blocked (`SET NULL`) → archive via `active=false`. Likely also a minimal `/configuracion/zonas` since ~42 zones now need management.

## Recommendation
Option 1 (columns on `package_templates`, matches the user's decision). Seed via `0012`. Split into 3 chained PRs: A = migration + rename + backfill + seed + harness/tests (~380); B = sales/booking picker rework (~200); C = tarifas (+zonas) ABM (~350). Chain A→B→C.

## Open Questions for the proposal
1. Option 1 (columns on template, = user decision) vs Option 2 (normalize size onto zones)?
2. Keep `default_sessions` (default 6)?
3. `gender`/`size_category` NOT NULL + backfill then drop default?
4. Add `unique(zone_id, gender)`?
5. Ship the ~78 EUR prices to prod via `0012` seed — authoritative?
6. Add `clinic_settings.currency` / locale now, or defer?
7. Replace/remove the 5 English demo `body_zones`; update seed-demo + e2e zone ref?
8. Does a "package" sale always == bono (6 sessions), and should the loose-session sale prefill `session_price`?
9. Confirm chained A → B → C split.
10. Minimal `/configuracion/zonas` ABM in scope, or tarifa-form-inline zone creation?

## Risks
- `price`→`bono_price` rename is breaking: generated types + ~8 files + 3 harnesses; Supabase string selects fail at RUNTIME.
- NOT NULL backfill silently labels demo/e2e rows `mujer`/`mediana`.
- 5 English demo zones coexist with ~42 real Spanish areas.
- `size_category` drift if per-template (Option 1) and not normalized.
- EUR values rendered through es-AR money formatting.
- Total work far exceeds the 400-line budget — chained PRs required.
