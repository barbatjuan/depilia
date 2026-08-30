-- Seed the real "sinvello" tariff catalog: 35 body zones and 68
-- package_templates (34 mujer + 34 hombre). Every bono is 6 sessions.
--
-- Idempotent: re-running inserts zero rows. body_zones is guarded by its
-- UNIQUE(name); package_templates by the partial unique index
-- package_templates_zone_gender_active_idx on (zone_id, gender) WHERE active
-- (from 0012).
--
-- Transcription safety (design decision 4): all 68 rows are transcribed once
-- into a single staging table. body_zones is derived from it via
-- `select distinct area`, and package_templates is joined back to it, so the
-- zone names on both sides are identical BY CONSTRUCTION. A `do $$` guard
-- asserts the staging table is exactly 68 rows / 35 distinct zones / 0
-- duplicate (area, gender) / plausible pricing and raises BEFORE the catalog
-- is touched.
--
-- The staging load, the body_zones insert and the package_templates insert
-- are SEPARATE statements on purpose: a data-modifying CTE's inserts are not
-- visible to a plain read in the same statement, so joining body_zones
-- beside an inserting CTE would silently match zero rows.

create temporary table catalog_seed (
  area          text not null,
  gender        text not null,
  size_category text not null,
  session_price numeric(12, 2) not null,
  bono_price    numeric(12, 2) not null
);

-- MINI — 11 zones, flat pricing per gender (mujer 6/30, hombre 8/36).
insert into catalog_seed (area, gender, size_category, session_price, bono_price)
select area, g.gender, 'mini', g.session_price, g.bono_price
from unnest(array[
  'Labio', 'Mentón', 'Entrecejo', 'Patillas', 'Pómulos', 'Orejas',
  'Manos', 'Nuca', 'Pies', 'Línea Alba', 'Areola'
]) as area
cross join (values
  ('mujer', 6::numeric, 30::numeric),
  ('hombre', 8::numeric, 36::numeric)
) as g(gender, session_price, bono_price);

-- GRANDE — 4 zones, flat pricing per gender (mujer 40/210, hombre 50/240).
insert into catalog_seed (area, gender, size_category, session_price, bono_price)
select area, g.gender, 'grande', g.session_price, g.bono_price
from unnest(array[
  'Piernas completas (incluye pies)', 'Brazos completos',
  'Espalda Completa', 'Tórax Completo'
]) as area
cross join (values
  ('mujer', 40::numeric, 210::numeric),
  ('hombre', 50::numeric, 240::numeric)
) as g(gender, session_price, bono_price);

-- PEQUEÑA — 10 rows. Asymmetric: "Ingles Completas" is mujer-only,
-- "Perfilado de barba" is hombre-only.
insert into catalog_seed (area, gender, size_category, session_price, bono_price)
values
  ('Perianal',          'mujer',  'pequena', 15,  72),
  ('Axilas',            'mujer',  'pequena', 10,  48),
  ('Ingles Normales',   'mujer',  'pequena', 10,  48),
  ('Ingles Brasileñas', 'mujer',  'pequena', 15,  72),
  ('Ingles Completas',  'mujer',  'pequena', 25, 120),
  ('Perianal',          'hombre', 'pequena', 15,  72),
  ('Perfilado de barba','hombre', 'pequena', 15,  72),
  ('Axilas',            'hombre', 'pequena', 10,  48),
  ('Ingles Normales',   'hombre', 'pequena', 10,  48),
  ('Ingles Brasileñas', 'hombre', 'pequena', 20,  90);

-- MEDIANA — 26 rows. mujer and hombre tiers do NOT correlate, so every row
-- is transcribed explicitly (e.g. mujer Lumbar 15/78 vs hombre Lumbar 30/150).
insert into catalog_seed (area, gender, size_category, session_price, bono_price)
values
  ('Medios brazos',   'mujer',  'mediana', 15,  78),
  ('Hombros',         'mujer',  'mediana', 15,  78),
  ('Abdomen',         'mujer',  'mediana', 25, 120),
  ('Cuello',          'mujer',  'mediana', 15,  78),
  ('Facial Completo', 'mujer',  'mediana', 15,  78),
  ('Glúteos',         'mujer',  'mediana', 25, 120),
  ('Lumbar',          'mujer',  'mediana', 15,  78),
  ('Barba',           'mujer',  'mediana', 15,  78),
  ('Media espalda',   'mujer',  'mediana', 25, 120),
  ('Antebrazo',       'mujer',  'mediana', 15,  78),
  ('Intermamaria',    'mujer',  'mediana', 15,  78),
  ('Medias piernas',  'mujer',  'mediana', 25, 120),
  ('Muslos',          'mujer',  'mediana', 25, 120),
  ('Medios brazos',   'hombre', 'mediana', 20, 108),
  ('Hombros',         'hombre', 'mediana', 20, 108),
  ('Abdomen',         'hombre', 'mediana', 30, 150),
  ('Cuello',          'hombre', 'mediana', 20, 108),
  ('Facial Completo', 'hombre', 'mediana', 20, 108),
  ('Glúteos',         'hombre', 'mediana', 30, 150),
  ('Lumbar',          'hombre', 'mediana', 30, 150),
  ('Barba',           'hombre', 'mediana', 20, 108),
  ('Media espalda',   'hombre', 'mediana', 30, 150),
  ('Antebrazo',       'hombre', 'mediana', 20, 108),
  ('Intermamaria',    'hombre', 'mediana', 20, 108),
  ('Medias piernas',  'hombre', 'mediana', 30, 150),
  ('Muslos',          'hombre', 'mediana', 30, 150);

-- CUERPO — 2 rows (mujer 80/450, hombre 110/600).
insert into catalog_seed (area, gender, size_category, session_price, bono_price)
values
  ('Cuerpo Completo', 'mujer',  'cuerpo',  80, 450),
  ('Cuerpo Completo', 'hombre', 'cuerpo', 110, 600);

-- Transcription guard — abort the whole migration before touching the
-- catalog if the staging table is not exactly the shape we transcribed.
do $$
declare
  v_rows      int;
  v_zones     int;
  v_dupes     int;
  v_bad_price int;
begin
  select count(*), count(distinct area) into v_rows, v_zones from catalog_seed;

  select count(*) into v_dupes from (
    select area, gender from catalog_seed
    group by area, gender having count(*) > 1
  ) d;

  select count(*) into v_bad_price from catalog_seed
  where session_price <= 0 or bono_price <= 0 or bono_price < session_price;

  if v_rows <> 68 then
    raise exception 'migration 0013: expected 68 catalog rows, got %', v_rows;
  end if;
  if v_zones <> 35 then
    raise exception 'migration 0013: expected 35 distinct zones, got %', v_zones;
  end if;
  if v_dupes <> 0 then
    raise exception 'migration 0013: % duplicate (area, gender) pair(s) in the seed', v_dupes;
  end if;
  if v_bad_price <> 0 then
    raise exception 'migration 0013: % seed row(s) with implausible pricing', v_bad_price;
  end if;
end;
$$;

-- 1. Body zones — derived from the staging table, so names match by
--    construction. Existing zones (incl. the archived English demo zones)
--    are left untouched.
insert into body_zones (name)
select distinct area from catalog_seed
on conflict (name) do nothing;

-- 2. Package templates — join the staging rows back to the zones. Separate
--    statement so the zones from step 1 are visible to this read.
insert into package_templates
  (zone_id, name, gender, size_category, default_sessions, session_price, bono_price, active)
select z.id, c.area, c.gender, c.size_category, 6, c.session_price, c.bono_price, true
from catalog_seed c
join body_zones z on z.name = c.area
on conflict (zone_id, gender) where active do nothing;

drop table catalog_seed;
