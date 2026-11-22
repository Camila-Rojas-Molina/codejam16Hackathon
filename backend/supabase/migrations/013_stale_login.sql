-- Stale logins: a browser can still hold a valid access token for a login that was deleted
-- (Authentication → Users in the dashboard, or a database reset). The token still passes, so
-- auth.uid() returns an id that no longer exists in auth.users, and creating a profile used to
-- fail with a raw foreign-key error ("profiles_auth_user_id_fkey"). Now it fails with errcode
-- 28000 and a clear message; the app signs the person out and sends them to Log in.
-- Run after 005 (any time; safe to run again). Same function as in 005 plus the first check.

create or replace function migo_create_account(p_name text, p_avatar text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  p  profiles;
begin
  if me is not null and not exists (select 1 from auth.users where id = me) then
    raise exception 'Your login no longer exists. Please log in again.' using errcode = '28000';
  end if;
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

revoke execute on function migo_create_account(text, text) from public;
grant execute on function migo_create_account(text, text) to anon, authenticated;
