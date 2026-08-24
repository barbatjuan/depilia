-- Dev-only seed data and test-support helpers. Safe to run against the local
-- `supabase start` stack; never applied to production (see README note).

-- Test-support helper used exclusively by tests/integration fixtures to
-- reset state between specs. SECURITY DEFINER + a hardcoded catalog of
-- application tables (never interpolated from arbitrary input beyond a
-- fixed allow-list) keeps this from being a generic SQL-injection surface.
create function public.truncate_table(table_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if table_name not in (
    'staff', 'clients', 'body_zones', 'package_templates', 'client_packages',
    'appointments', 'sales', 'payments', 'expense_categories', 'expenses',
    'reminder_log', 'clinic_settings'
  ) then
    raise exception 'truncate_table: % is not an allowed table', table_name;
  end if;
  execute format('truncate table %I restart identity cascade', table_name);
end;
$$;

-- Seed catalog data useful for local dev / manual QA. The first admin staff
-- row must be inserted separately once the corresponding Supabase Auth user
-- exists locally (see README: "First-run local setup").
insert into body_zones (name) values
  ('underarms'), ('legs'), ('bikini'), ('face'), ('back')
on conflict (name) do nothing;

insert into expense_categories (name) values
  ('Alquiler'), ('Insumos'), ('Servicios'), ('Marketing')
on conflict do nothing;

insert into clinic_settings (id, clinic_name) values (true, 'Depilia')
on conflict (id) do nothing;
