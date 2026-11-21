-- Checks 004_migo_profiles.sql: one account, two modes, nothing lost when switching. Rolls back.
-- Run in the Supabase SQL editor (or psql) after the migrations. Prints "All MIGO profile checks passed".
begin;

do $$
declare
  acct   jsonb;
  pid    uuid;
  rec    jsonb;
  got    jsonb;
begin
  acct := migo_create_account('  Zephyrine ', 'owl');
  pid := (acct ->> 'id')::uuid;
  assert acct ->> 'name' = 'Zephyrine', 'name is trimmed';
  assert (select role from profiles where profiles.id = pid) is null, 'no role at registration';
  assert (migo_get_profile(pid) -> 'record') = 'null'::jsonb, 'no record before first save';

  rec := jsonb_build_object(
    'accountId', pid::text,
    'activeMode', 'tourist',
    'universal', jsonb_build_object('homeCity', ' Montréal ',
                                    'dogs', jsonb_build_object('stance', 'has-dog'),
                                    'citiesDiscovered', jsonb_build_array(jsonb_build_object('id', 'c1', 'name', 'Lisbon'))),
    'tourist', jsonb_build_object('trips', jsonb_build_array(jsonb_build_object('id', 't1', 'destination', 'Paris')),
                                  'activeTripId', 't1'),
    'local', jsonb_build_object('homeCity', 'Montréal'));
  perform migo_save_record(pid, rec);

  got := migo_get_profile(pid);
  assert got #>> '{record,universal,citiesDiscovered,0,name}' = 'Lisbon', 'cities discovered saved';
  assert (select home_city from migo_profiles where profile_id = pid) = 'Montréal', 'home city extracted';
  assert (select role from profiles where profiles.id = pid) = 'tourist', 'role mirrors active mode';
  assert (select has_dog from profiles where profiles.id = pid), 'has_dog mirrors the dog answer';

  -- Switch to Local mode: same account, both contexts kept.
  perform migo_save_record(pid, jsonb_set(rec, '{activeMode}', '"local"'));
  got := migo_get_profile(pid);
  assert (select role from profiles where profiles.id = pid) = 'local', 'role follows mode switch';
  assert got #>> '{record,tourist,trips,0,destination}' = 'Paris', 'tourist trip survives switch';
  assert got #>> '{record,local,homeCity}' = 'Montréal', 'local context survives switch';
  assert (select count(*) from profiles where name = 'Zephyrine') = 1, 'still one account';

  perform migo_update_account(pid, 'Cami', 'sun');
  assert migo_get_profile(pid) #>> '{account,avatar}' = 'sun', 'avatar updated';

  begin
    perform migo_save_record(pid, jsonb_set(rec, '{accountId}', '"someone-else"'));
    assert false, 'saving another account''s record must fail';
  exception when sqlstate '22023' then null;
  end;

  perform migo_delete_account(pid);
  assert migo_get_profile(pid) is null, 'account deleted';
  assert not exists (select 1 from migo_profiles where profile_id = pid), 'record deleted with account';

  raise notice 'All MIGO profile checks passed';
end;
$$;

rollback;
