-- Extensions required by later migrations:
-- pgcrypto: gen_random_uuid() for primary keys
-- btree_gist: enables GiST EXCLUDE constraints over scalar equality (client_id/zone_id)
--   combined with the tstzrange overlap check on appointments.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- PostgREST connects as anon/authenticated/service_role, never as the
-- migration-owning `postgres` role. RLS policies only ever RESTRICT access
-- that GRANTs already allow -- without these grants every query is denied
-- before a policy is even evaluated. `alter default privileges` here
-- applies to every table/sequence/function created by subsequent migrations
-- in this same role, so it must run before any table exists.
grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
