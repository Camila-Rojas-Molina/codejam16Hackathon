-- MIGO profiles: one account per person, two ways to explore.
-- Run after 001–003. Safe to run again.
--
--   * A person is one row in `profiles` (name, avatar). Tourist/Local is a MODE, not an account
--     type, so `profiles.role` becomes "current mode" (null until they pick one). It's kept in sync
--     from the record so find_partner() keeps working unchanged.
--   * Everything from the questionnaire and both modes lives in one JSON record per profile
--     (`migo_profiles.record`, shape = ProfileRecord in frontend/src/features/profile/types.ts):
--     universal profile (incl. home city and cities discovered), tourist trips, local context,
--     rewards and likes. Switching modes only changes `activeMode` inside it.
--   * The browser can't read or write the table directly; it calls the functions below.
--
-- Known gap (hackathon): like the rest of this backend there's no login yet, and the client
-- sends the whole record, including the points ledger. Before real use, add Supabase Auth and
-- move point awards/purchases into dedicated functions that check them on the server.

alter table profiles alter column role drop not null;

create table if not exists migo_profiles (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  record      jsonb not null default '{}'::jsonb
    check (jsonb_typeof(record) = 'object' and octet_length(record::text) < 262144),
  -- Pulled out of the record for matching and search ("locals in Lisbon").
  home_city   text generated always as (nullif(btrim(record #>> '{universal,homeCity}'), '')) stored,
  updated_at  timestamptz not null default now()
);
create index if not exists migo_profiles_home_city_idx on migo_profiles (lower(home_city));

alter table migo_profiles enable row level security;
revoke all on migo_profiles from anon, authenticated;

-- ---------------------------------------------------------------------------
-- API functions
-- ---------------------------------------------------------------------------

create or replace function migo_account_json(p profiles) returns jsonb
language sql immutable as $$
  select jsonb_build_object('id', p.id, 'name', p.name, 'avatar', p.avatar, 'created_at', p.created_at)
$$;

-- Registration: name + avatar. No role: the mode is picked later and can change any time.
create or replace function migo_create_account(p_name text, p_avatar text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p profiles;
begin
  insert into profiles (name, avatar, role) values (btrim(p_name), p_avatar, null) returning * into p;
  insert into migo_profiles (profile_id) values (p.id);
  return migo_account_json(p);
end;
$$;

-- The account plus its saved record (record is null until the first save). Null if the account is gone.
create or replace function migo_get_profile(p_profile_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'account', migo_account_json(p),
           'record', case when m.record = '{}'::jsonb then null else m.record end)
    from profiles p
    left join migo_profiles m on m.profile_id = p.id
   where p.id = p_profile_id
$$;

create or replace function migo_update_account(p_profile_id uuid, p_name text, p_avatar text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles set name = btrim(p_name), avatar = p_avatar where id = p_profile_id;
  if not found then
    raise exception 'Unknown profile %', p_profile_id using errcode = 'P0002';
  end if;
end;
$$;

-- Saves the whole record and mirrors the bits the hunt/matching functions read.
create or replace function migo_save_record(p_profile_id uuid, p_record jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  mode text := p_record ->> 'activeMode';
begin
  if jsonb_typeof(p_record) is distinct from 'object' then
    raise exception 'Record must be a JSON object' using errcode = '22023';
  end if;
  if (p_record ->> 'accountId') is distinct from p_profile_id::text then
    raise exception 'Record belongs to a different account' using errcode = '22023';
  end if;
  if not exists (select 1 from profiles where id = p_profile_id) then
    raise exception 'Unknown profile %', p_profile_id using errcode = 'P0002';
  end if;

  insert into migo_profiles (profile_id, record, updated_at)
  values (p_profile_id, p_record, now())
  on conflict (profile_id) do update set record = excluded.record, updated_at = now();

  update profiles
     set role    = case when mode in ('tourist', 'local') then mode end,
         has_dog = coalesce(p_record #>> '{universal,dogs,stance}', '') = 'has-dog'
   where id = p_profile_id;
end;
$$;

-- Deletes the person and everything attached (record, team memberships) for good.
create or replace function migo_delete_account(p_profile_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from profiles where id = p_profile_id;
$$;

revoke execute on function migo_create_account(text, text) from public;
revoke execute on function migo_get_profile(uuid) from public;
revoke execute on function migo_update_account(uuid, text, text) from public;
revoke execute on function migo_save_record(uuid, jsonb) from public;
revoke execute on function migo_delete_account(uuid) from public;
grant execute on function migo_create_account(text, text) to anon, authenticated;
grant execute on function migo_get_profile(uuid) to anon, authenticated;
grant execute on function migo_update_account(uuid, text, text) to anon, authenticated;
grant execute on function migo_save_record(uuid, jsonb) to anon, authenticated;
grant execute on function migo_delete_account(uuid) to anon, authenticated;
