-- Real login (Supabase Auth, email + password). Run after 004. Safe to run again.
--
--   * A profile can belong to a login: profiles.auth_user_id = auth.users.id (one profile per login).
--   * The browser sends the signed-in user's access token, so auth.uid() is their id inside SQL.
--   * Owner rule, checked by every migo_* function that takes a profile id:
--       - profile has an auth_user_id  -> only that login may read/change/delete it,
--         otherwise 'Not your account' (errcode 42501);
--       - profile has no auth_user_id  -> demo/seed or pre-login account, works as before.
--   * migo_my_profile() returns the signed-in user's profile, so the app doesn't need a stored id.
--   * migo_delete_account also deletes the login itself.

alter table profiles add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_auth_user_id_key') then
    alter table profiles add constraint profiles_auth_user_id_key unique (auth_user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_auth_user_id_fkey') then
    alter table profiles add constraint profiles_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete cascade;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner check
-- ---------------------------------------------------------------------------

-- Raises 42501 'Not your account' if the profile belongs to a login other than the caller's.
-- Unknown profiles pass, so callers keep their own "not found" behaviour.
create or replace function migo_assert_owner(p_profile_id uuid) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  owner_id uuid;
begin
  select auth_user_id into owner_id from profiles where id = p_profile_id;
  if owner_id is not null and owner_id is distinct from auth.uid() then
    raise exception 'Not your account' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- API functions (same signatures as 004, now with the owner rule)
-- ---------------------------------------------------------------------------

-- Registration. Signed in: the profile is linked to the login (one per login).
-- Not signed in: an unlinked profile, as before.
create or replace function migo_create_account(p_name text, p_avatar text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  p  profiles;
begin
  if me is not null and exists (select 1 from profiles where auth_user_id = me) then
    raise exception 'This login already has a profile' using errcode = '23505';
  end if;
  begin
    insert into profiles (name, avatar, role, auth_user_id)
    values (btrim(p_name), p_avatar, null, me) returning * into p;
  exception when unique_violation then
    raise exception 'This login already has a profile' using errcode = '23505';
  end;
  insert into migo_profiles (profile_id) values (p.id);
  return migo_account_json(p);
end;
$$;

-- The signed-in user's profile, same shape as migo_get_profile. Null if not signed in or no profile yet.
create or replace function migo_my_profile() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'account', migo_account_json(p),
           'record', case when m.record = '{}'::jsonb then null else m.record end)
    from profiles p
    left join migo_profiles m on m.profile_id = p.id
   where p.auth_user_id = auth.uid()
$$;

create or replace function migo_get_profile(p_profile_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform migo_assert_owner(p_profile_id);
  return (
    select jsonb_build_object(
             'account', migo_account_json(p),
             'record', case when m.record = '{}'::jsonb then null else m.record end)
      from profiles p
      left join migo_profiles m on m.profile_id = p.id
     where p.id = p_profile_id);
end;
$$;

create or replace function migo_update_account(p_profile_id uuid, p_name text, p_avatar text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform migo_assert_owner(p_profile_id);
  update profiles set name = btrim(p_name), avatar = p_avatar where id = p_profile_id;
  if not found then
    raise exception 'Unknown profile %', p_profile_id using errcode = 'P0002';
  end if;
end;
$$;

create or replace function migo_save_record(p_profile_id uuid, p_record jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  mode text := p_record ->> 'activeMode';
begin
  perform migo_assert_owner(p_profile_id);
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

-- Deletes the person, everything attached, and (for a linked profile) the login itself.
-- 004 made this a `language sql` function; replacing it with plpgsql keeps the same signature.
create or replace function migo_delete_account(p_profile_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid;
begin
  perform migo_assert_owner(p_profile_id);
  select auth_user_id into owner_id from profiles where id = p_profile_id;
  delete from profiles where id = p_profile_id;
  -- The owner check guarantees owner_id = auth.uid() here.
  if owner_id is not null and owner_id = auth.uid() then
    delete from auth.users where id = owner_id;
  end if;
end;
$$;

revoke execute on function migo_assert_owner(uuid) from public, anon, authenticated;
revoke execute on function migo_create_account(text, text) from public;
revoke execute on function migo_my_profile() from public;
revoke execute on function migo_get_profile(uuid) from public;
revoke execute on function migo_update_account(uuid, text, text) from public;
revoke execute on function migo_save_record(uuid, jsonb) from public;
revoke execute on function migo_delete_account(uuid) from public;
grant execute on function migo_create_account(text, text) to anon, authenticated;
grant execute on function migo_my_profile() to anon, authenticated;
grant execute on function migo_get_profile(uuid) to anon, authenticated;
grant execute on function migo_update_account(uuid, text, text) to anon, authenticated;
grant execute on function migo_save_record(uuid, jsonb) to anon, authenticated;
grant execute on function migo_delete_account(uuid) to anon, authenticated;
