-- Checks 005_auth.sql: profiles linked to a login can only be used by that login. Rolls back.
-- Run in the Supabase SQL editor (or psql) after the migrations. Prints "All auth checks passed".
-- Users are simulated by inserting into auth.users and setting the JWT claims that auth.uid() reads.
begin;

-- Switch identity: a user id, or null for "not signed in" (anon key only).
create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    case when p_user is null then '' else
                      jsonb_build_object('sub', p_user, 'role', 'authenticated')::text end, true),
         set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
$$;

do $$
declare
  alice  uuid := 'a11ce000-0000-4000-8000-000000000001';
  bob    uuid := 'b0b00000-0000-4000-8000-000000000002';
  acct   jsonb;
  pid    uuid;
  legacy uuid;
  rec    jsonb;
  denied boolean;
begin
  insert into auth.users (id, email) values (alice, 'alice@example.test'), (bob, 'bob@example.test');

  -- Not signed in: nothing to return.
  perform pg_temp.act_as(null);
  assert migo_my_profile() is null, 'my_profile is null when not signed in';

  -- Alice signs up and creates her profile.
  perform pg_temp.act_as(alice);
  assert auth.uid() = alice, 'auth.uid() reads the JWT claims';
  assert migo_my_profile() is null, 'my_profile is null before the profile exists';
  acct := migo_create_account('Alice', 'owl');
  pid := (acct ->> 'id')::uuid;
  assert (select auth_user_id from profiles where id = pid) = alice, 'create links auth_user_id';
  assert migo_my_profile() #>> '{account,id}' = pid::text, 'my_profile returns her profile';
  assert migo_my_profile() -> 'record' = 'null'::jsonb, 'my_profile record is null before first save';
  assert migo_my_profile() = migo_get_profile(pid), 'my_profile has the same shape as get_profile';

  -- One profile per login.
  begin
    perform migo_create_account('Alice again', 'owl');
    assert false, 'second create for the same login must fail';
  exception when sqlstate '23505' then
    assert sqlerrm = 'This login already has a profile', 'duplicate message';
  end;

  -- She can use her own profile.
  rec := jsonb_build_object('accountId', pid::text, 'activeMode', 'local');
  perform migo_save_record(pid, rec);
  perform migo_update_account(pid, 'Alicia', 'sun');
  assert migo_my_profile() #>> '{record,activeMode}' = 'local', 'owner can save';
  assert migo_get_profile(pid) #>> '{account,name}' = 'Alicia', 'owner can update';

  -- Bob, then an anonymous caller, are refused on every call.
  for i in 1..2 loop
    perform pg_temp.act_as(case when i = 1 then bob end);
    denied := false;
    begin perform migo_get_profile(pid);
    exception when sqlstate '42501' then denied := sqlerrm = 'Not your account'; end;
    assert denied, 'get_profile refused for ' || i;
    denied := false;
    begin perform migo_update_account(pid, 'Hacked', 'x');
    exception when sqlstate '42501' then denied := true; end;
    assert denied, 'update_account refused for ' || i;
    denied := false;
    begin perform migo_save_record(pid, rec);
    exception when sqlstate '42501' then denied := true; end;
    assert denied, 'save_record refused for ' || i;
    denied := false;
    begin perform migo_delete_account(pid);
    exception when sqlstate '42501' then denied := true; end;
    assert denied, 'delete_account refused for ' || i;
  end loop;
  assert (select name from profiles where id = pid) = 'Alicia', 'nothing changed by others';

  -- Bob's my_profile doesn't see Alice's.
  perform pg_temp.act_as(bob);
  assert migo_my_profile() is null, 'bob has no profile yet';

  -- Legacy profile (no login) still works for anyone, signed in or not.
  perform pg_temp.act_as(null);
  legacy := (migo_create_account('Legacy', 'cat') ->> 'id')::uuid;
  assert (select auth_user_id from profiles where id = legacy) is null, 'anonymous create stays unlinked';
  perform migo_save_record(legacy, jsonb_build_object('accountId', legacy::text, 'activeMode', 'tourist'));
  perform pg_temp.act_as(bob);
  perform migo_update_account(legacy, 'Legacy2', 'cat');
  assert migo_get_profile(legacy) #>> '{account,name}' = 'Legacy2', 'legacy profile still usable';
  perform migo_delete_account(legacy);
  assert migo_get_profile(legacy) is null, 'legacy delete works';
  assert exists (select 1 from auth.users where id = bob), 'legacy delete leaves the caller''s login alone';

  -- Alice deletes her account: profile, record and login are gone.
  perform pg_temp.act_as(alice);
  perform migo_delete_account(pid);
  assert not exists (select 1 from profiles where id = pid), 'profile deleted';
  assert not exists (select 1 from migo_profiles where profile_id = pid), 'record deleted';
  assert not exists (select 1 from auth.users where id = alice), 'login deleted';
  assert migo_my_profile() is null, 'my_profile null after delete';

  raise notice 'All auth checks passed';
end;
$$;

rollback;
