-- LOCAL TESTING ONLY. NEVER RUN THIS ON SUPABASE (it would clash with the real auth schema).
--
-- Plain Postgres has no Supabase `auth` schema or API roles. This file fakes just enough of them
-- to run the migrations and tests locally:
--   psql -v ON_ERROR_STOP=1 -f backend/tests/local_supabase_stub.sql   (then 001, 002, 004, 005, tests)
-- auth.uid() mirrors Supabase: it reads the JWT "sub" claim that PostgREST puts in the session.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key,
  email text
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(
           coalesce(
             nullif(current_setting('request.jwt.claim.sub', true), ''),
             nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'),
           '')::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
