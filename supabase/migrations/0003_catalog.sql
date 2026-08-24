-- Catalog tables: body zones, package templates, expense categories, and a
-- single-row clinic settings table.
create table body_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  archived boolean not null default false
);

create table package_templates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references body_zones (id) on delete restrict,
  name text not null,
  default_sessions int not null check (default_sessions > 0),
  price numeric(12, 2) not null check (price >= 0),
  active boolean not null default true
);

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  archived boolean not null default false
);

-- Case-insensitive uniqueness among active (non-archived) categories only,
-- so an archived "Alquiler" doesn't block re-creating "alquiler".
create unique index expense_categories_name_active_idx
  on expense_categories (lower(name))
  where not archived;

create table clinic_settings (
  id boolean primary key default true check (id),
  clinic_name text,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  reminder_hours int not null default 24
);

alter table body_zones enable row level security;
alter table package_templates enable row level security;
alter table expense_categories enable row level security;
alter table clinic_settings enable row level security;

create policy "body_zones_staff_all" on body_zones
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "package_templates_staff_all" on package_templates
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "expense_categories_staff_all" on expense_categories
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "clinic_settings_staff_all" on clinic_settings
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
