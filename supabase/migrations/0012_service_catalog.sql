-- Turn package_templates into the real "tarifas" catalog: gendered,
-- size-grouped rows carrying a per-session price and a 6-session bono price.
-- `price` becomes `bono_price` (the bono price already snapshotted onto
-- sales.total), a `session_price` is added for loose sessions, and `gender`
-- / `size_category` classify each tariff. One ACTIVE tariff per (zone,
-- gender) is enforced by a PARTIAL unique index — a total constraint would
-- make archiving a tariff irreversible (staff could never replace it),
-- mirroring expense_categories_name_active_idx from 0003.
--
-- The 5 English demo zones from 0010 are ARCHIVED, not deleted: body_zones
-- is ON DELETE RESTRICT from package_templates / appointments /
-- client_packages, so a delete fails on any dev DB that already used them.

-- 1. Preflight. A non-positive legacy price would backfill session_price to
--    round(price/6, 2) = 0 and violate the new `> 0` CHECKs. Fail loudly
--    before touching any DDL so the migration is all-or-nothing.
do $$
begin
  if exists (select 1 from package_templates where price <= 0) then
    raise exception
      'migration 0012: % package_templates row(s) have price <= 0 — fix them before migrating',
      (select count(*) from package_templates where price <= 0);
  end if;
end;
$$;

-- 2. New columns, nullable for the backfill.
alter table package_templates
  add column gender text,
  add column size_category text,
  add column session_price numeric(12, 2);

-- 3. Rename price -> bono_price. NOTE: Postgres does NOT rename the attached
--    `package_templates_price_check` constraint — it is dropped explicitly
--    in step 6.
alter table package_templates rename column price to bono_price;

-- 4. Backfill pre-existing rows.
update package_templates
set gender = coalesce(gender, 'mujer'),
    size_category = coalesce(size_category, 'mediana'),
    session_price = coalesce(session_price, round(bono_price / 6, 2));

-- 5. Lock the backfilled columns down.
alter table package_templates
  alter column gender set not null,
  alter column size_category set not null,
  alter column session_price set not null;

-- 6. Swap the old `price >= 0` CHECK for the new money + enum CHECKs, and
--    make the default bono length explicit (6 sessions).
alter table package_templates drop constraint package_templates_price_check;

alter table package_templates
  add constraint package_templates_bono_price_check check (bono_price > 0),
  add constraint package_templates_session_price_check check (session_price > 0),
  add constraint package_templates_gender_check
    check (gender in ('mujer', 'hombre')),
  add constraint package_templates_size_category_check
    check (size_category in ('mini', 'pequena', 'mediana', 'grande', 'cuerpo'));

alter table package_templates alter column default_sessions set default 6;

-- 7. Retire the 5 English demo zones (deactivate their templates first, then
--    archive the zones) — BEFORE the partial unique index so a deactivated
--    duplicate never trips it.
update package_templates
set active = false
where zone_id in (
  select id from body_zones
  where name in ('underarms', 'legs', 'bikini', 'face', 'back')
);

update body_zones
set archived = true
where name in ('underarms', 'legs', 'bikini', 'face', 'back');

-- 8. One ACTIVE tariff per (zone, gender). Partial, so an archived pair can
--    be replaced by a new active one.
create unique index package_templates_zone_gender_active_idx
  on package_templates (zone_id, gender)
  where active;
