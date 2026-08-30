# Apply Progress: Catalogo de Tarifas

Hybrid store — Engram topic `sdd/catalogo-tarifas/apply-progress`.

## Slice A1 — Migration 0012 schema + harnesses — DONE

PR 1 (base: `caja-diaria-pr-c` @ 527c7ea, branch `catalogo-tarifas-pr-a1`).
Strict TDD. Test runner `pnpm test`. Local Supabase.

### Completed tasks

- [x] A1.1 – A1.16 (all of Phase A1)

### Files changed

| File | Action | What |
|------|--------|------|
| `supabase/migrations/0012_service_catalog.sql` | Created | 8 ordered steps: preflight `do $$` on `price <= 0`; add nullable `gender`/`size_category`/`session_price`; `rename price -> bono_price`; `coalesce` backfill (`mujer`/`mediana`/`round(bono_price/6,2)`); `set not null`; drop `package_templates_price_check` then add `bono_price>0`, `session_price>0`, `gender in`, `size_category in`, `default_sessions` default 6; archive 5 English demo zones + deactivate their templates; partial unique index `package_templates_zone_gender_active_idx (zone_id, gender) where active` |
| `src/lib/supabase/types.ts` | Regenerated | `npx supabase gen types typescript --local` after `supabase db reset` |
| `src/features/packages/data/package-templates.ts` | Modified | select `id, zone_id, name, gender, size_category, default_sessions, session_price, bono_price, body_zones(name)`; maps `bonoPrice`/`sessionPrice`/`gender`/`sizeCategory` |
| `src/features/packages/domain/sell-package.ts` | Modified | added `Gender`/`SizeCategory` unions; `PackageTemplateOption` renames `price`→`bonoPrice`, adds `gender`/`sizeCategory`/`sessionPrice`; template branch of `buildPackageSalePayload` maps `price: template.bonoPrice` |
| `tests/integration/helpers/pg.ts` | Created | `withPgClient` raw-Postgres helper (`pg`) for migration-time assertions PostgREST can't reach |
| `tests/integration/catalog/schema.test.ts` | Created | 7 specs: preflight raise, backfill values, English demo retirement (all via `BEGIN` + revert-to-pre-0012 + replay real migration file + `ROLLBACK`), enum/positive-price CHECKs, NOT NULL, partial unique index, RLS non-staff denial |
| `tests/integration/helpers/fixtures.ts` | Modified | `seedPackageTemplate` params → `{ zone_id, name, gender?, size_category?, default_sessions, session_price?, bono_price }` (new enum/price fields default to `mujer`/`mediana`/`bono_price/6`) |
| `tests/integration/sell-package.test.ts` | Modified | Axilas fixture + payload template object gain `gender`/`sizeCategory`/`sessionPrice`/`bonoPrice` |
| `tests/unit/features/packages/sell-package.test.ts` | Modified | template object renamed `price`→`bonoPrice`, added new fields (payload expectation unchanged) |
| `scripts/seed-demo.mjs` | Modified | `serviceSpecs` → 5 real Spanish areas (Piernas completas, Axilas, Facial Completo, Muslos, Media espalda) with `gender`/`size_category`/`session_price`/`bono_price`; zones derived from those names; `p.template.price` → `p.template.bono_price` |
| `e2e/global-setup.ts` | Modified | new constants (`E2E_CURRENCY`, `E2E_LOCALE`, `E2E_PACKAGE_TEMPLATE_{ZONE,NAME}="Axilas"`, `_GENDER`, `_SIZE`, `_SESSIONS=6`, `_SESSION_PRICE=10`, `_BONO_PRICE=48`); `E2E_PACKAGE_TEMPLATE_PRICE` kept as alias of bono price until Slice B; `ensurePackageTemplate` inserts the new columns |
| `package.json` / `pnpm-lock.yaml` | Modified | add devDependency `pg` + `@types/pg` |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A1.1 | `tests/integration/catalog/schema.test.ts` | Integration (raw pg) | N/A (new) | ✅ ENOENT on missing `0012` | ✅ Passed | ➖ Single (one guard) | ➖ None needed |
| A1.2 | same | Integration | N/A (new) | ✅ | ✅ Passed | ✅ 4 bad rows + 1 valid | ➖ None |
| A1.3 | same | Integration | N/A (new) | ✅ | ✅ Passed | ✅ 4 columns asserted | ➖ None |
| A1.4 | same | Integration (raw pg) | N/A (new) | ✅ | ✅ Passed | ➖ Single (exact backfill row) | ➖ None |
| A1.5 | same | Integration | N/A (new) | ✅ | ✅ Passed | ✅ dupe-active rejected / archived+active allowed / other gender allowed | ➖ None |
| A1.6 | same | Integration (raw pg) | N/A (new) | ✅ | ✅ Passed | ➖ Single (5 zones archived) | ➖ None |
| A1.7 | same | Integration | ✅ mirrors `rls-staff.test.ts` | ✅ | ✅ Passed | ✅ body_zones + package_templates | ➖ None |
| A1.10/11 | `tests/unit/features/packages/sell-package.test.ts` | Unit | ✅ 6/6 pre-existing | ✅ rename breaks compile | ✅ Passed | ✅ template + custom branches | ➖ None |

RED for the schema suite was executed (`ENOENT ... 0012_service_catalog.sql`) before the migration file existed. GREEN executed after `supabase db reset`.

### Test / lint / typecheck / e2e results

- `pnpm typecheck` — pass (0 errors)
- `pnpm lint` — pass (0 warnings)
- `pnpm test` — 50 files, 227 passed / 0 failed (includes new `catalog/schema.test.ts` 7/7)
- `pnpm e2e` — 4 passed (golden-path, caja, 2× login)

### Deviations from design

1. `seedPackageTemplate` new params are optional with sane defaults rather than all-required — keeps the single existing caller and future callers terse; DB columns remain NOT NULL.
2. Added `pg` + `@types/pg` devDependency and `tests/integration/helpers/pg.ts`. The design's ~130-line test estimate assumed PostgREST-only assertions; migration-time behavior (preflight raise, in-place backfill) genuinely needs raw SQL. Tests replay the real migration file inside `BEGIN … ROLLBACK` after reverting to the pre-0012 shape, so they stay bound to the migration text.
3. `E2E_PACKAGE_TEMPLATE_PRICE` kept as an alias of `E2E_PACKAGE_TEMPLATE_BONO_PRICE` so `e2e/golden-path.spec.ts` needs no edit in A1 (its money-assertion rewrite is Slice B.13). Golden path stays green with ARS formatting on bono 48 (pay 29, balance 19).
4. `Gender` / `SizeCategory` unions live in `src/features/packages/domain/sell-package.ts` for A1; Slice C may relocate them to `tariff-picker.ts`.

### Authored line count

~465 added / ~32 deleted ≈ **~497 authored** (excludes generated `src/lib/supabase/types.ts` and `pnpm-lock.yaml`; excludes the untracked `openspec/changes/catalogo-tarifas/**` SDD docs committed alongside). Design estimated ~302. Overrun ~95 lines, entirely in reusable test infrastructure (`pg` helper + migration-replay pattern, reused by A2) and the RLS spec. Per the accepted 6-slice plan a modest A1 overrun is fine; not sub-split further.

### Rollback boundary

Drop `package_templates_zone_gender_active_idx` + the 4 new constraints, `rename bono_price -> price`, drop the 3 columns, `update body_zones set archived=false where name in (5 English)`. Revert the 8 touched source/harness files. `client_packages` / `sales` never need rollback.

## Slices A2 – D2 — NOT STARTED
