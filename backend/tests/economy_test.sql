-- Checks 007_economy.sql: points, quests and the shop are decided by the server. Rolls back.
-- Run in the Supabase SQL editor (or psql) after the migrations (007 and 008).
-- Prints "All economy checks passed".
--
-- It brings its own test catalogue (ids 't-…'; everything else is retired inside this transaction),
-- so it doesn't depend on what 008 contains. Users are simulated like in auth_test.sql, and time
-- with `economy.test_now` (read by economy_now(); see the top of 007_economy.sql).
begin;
set local timezone = 'UTC';

create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    case when p_user is null then '' else
                      jsonb_build_object('sub', p_user, 'role', 'authenticated')::text end, true),
         set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
$$;

-- Moves the economy clock.
create or replace function pg_temp.at(p_ts text) returns void language sql as $$
  select set_config('economy.test_now', p_ts, true);
$$;

-- Runs a statement; returns '' if it worked, else '<sqlstate>' or '<sqlstate>/<hint>'.
create or replace function pg_temp.fails(p_sql text) returns text language plpgsql as $$
declare
  v_state text;
  v_hint  text;
begin
  execute p_sql;
  return '';
exception when others then
  get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint;
  return v_state || case when coalesce(v_hint, '') <> '' then '/' || v_hint else '' end;
end;
$$;

-- Active quests of one category in a state.
create or replace function pg_temp.active(p_state jsonb, p_category text) returns jsonb language sql as $$
  select coalesce(jsonb_agg(q), '[]'::jsonb) from jsonb_array_elements(p_state -> 'quests') q
   where q ->> 'category' = p_category and q ->> 'status' = 'active'
$$;

create or replace function pg_temp.balance(p uuid) returns bigint language sql as $$
  select coalesce(sum(amount), 0) from points_ledger where profile_id = p
$$;

-- ---------------------------------------------------------------------------
-- Test catalogue
-- ---------------------------------------------------------------------------
update quest_defs set retired = true;
update shop_items set retired = true;

insert into quest_defs (id, category, title, reward, condition, interests, company, modes, avoid_for, effort) values
  ('t-w1', 'weekly', 'W1', 700, '{"type":"visit","page":"map"}', '{}', 'either', '{}', '{}', 'moderate'),
  ('t-w2', 'weekly', 'W2', 700, '{"type":"visit","page":"chat"}', '{}', 'solo', '{}', '{}', 'moderate'),
  ('t-w3', 'weekly', 'W3', 700, '{"type":"visit","page":"gallery"}', '{}', 'either', '{}', '{}', 'moderate'),
  ('t-w-duo', 'weekly', 'W duo', 700, '{"type":"hunts","count":1,"withPartner":true}', '{}', 'companion', '{}', '{}', 'big'),
  ('t-d-map', 'daily', 'D map', 100, '{"type":"visit","page":"map"}', '{}', 'either', '{}', '{}', 'light'),
  ('t-d-chat', 'daily', 'D chat', 100, '{"type":"visit","page":"chat"}', '{}', 'either', '{}', '{}', 'light'),
  ('t-d-gallery', 'daily', 'D gallery', 100, '{"type":"visit","page":"gallery"}', '{}', 'either', '{}', '{}', 'light'),
  ('t-d-shop', 'daily', 'D shop', 100, '{"type":"visit","page":"shop"}', '{}', 'either', '{}', '{}', 'light'),
  ('t-d-quests', 'daily', 'D quests', 100, '{"type":"visit","page":"quests"}', '{}', 'either', '{}', '{}', 'light'),
  ('t-d-photo', 'daily', 'D photo', 80, '{"type":"photos","count":1,"requireCity":true}', '{}', 'either', '{}', '{}', 'light'),
  ('t-d-duo', 'daily', 'D duo', 110, '{"type":"hunts","count":1,"withPartner":true}', '{}', 'companion', '{}', '{}', 'moderate'),
  ('t-a-food-art', 'adventure', 'A food+art', 250, '{"type":"photos","count":2}', array['food', 'art'], 'either', '{}', '{}', 'big'),
  ('t-a-food', 'adventure', 'A food', 200, '{"type":"photos","count":1}', array['food'], 'either', '{}', '{}', 'light'),
  ('t-a-art', 'adventure', 'A art', 200, '{"type":"photos","count":1}', array['art'], 'solo', '{}', '{}', 'moderate'),
  ('t-a-food-duo', 'adventure', 'A food duo', 200, '{"type":"hunts","count":1,"withPartner":true}', array['food'], 'companion', '{}', '{}', 'moderate'),
  ('t-a-food-stairs', 'adventure', 'A stairs', 300, '{"type":"photos","count":1}', array['food', 'art'], 'solo', '{}', array['wheelchair'], 'big'),
  ('t-a-food-tourist', 'adventure', 'A tourist', 300, '{"type":"photos","count":1}', array['food', 'art'], 'either', array['tourist'], '{}', 'light'),
  ('t-a-sports', 'adventure', 'A sports', 150, '{"type":"photos","count":1}', array['sports'], 'either', '{}', '{}', 'big'),
  ('t-a-music', 'adventure', 'A music', 150, '{"type":"photos","count":1}', array['music'], 'solo', '{}', '{}', 'moderate'),
  ('t-s-profile', 'starter', 'S profile', 50, '{"type":"profile","check":"questionnaire_complete"}', '{}', null, '{}', '{}', null),
  ('t-s-map', 'starter', 'S map', 25, '{"type":"visit","page":"map"}', '{}', null, '{}', '{}', null)
on conflict (id) do update
  set category = excluded.category, title = excluded.title, reward = excluded.reward, condition = excluded.condition,
      interests = excluded.interests, company = excluded.company, modes = excluded.modes,
      avoid_for = excluded.avoid_for, effort = excluded.effort, retired = false;

insert into shop_items (id, kind, name, slot, rarity_or_tier, price) values
  ('t-hat', 'accessory', 'Test hat', 'head', 'common', 60),
  ('t-specs', 'accessory', 'Test specs', 'face', 'common', 40),
  ('t-gown', 'accessory', 'Test gown', 'back', 'premium', 100000),
  ('t-old', 'accessory', 'Old hat', 'head', 'common', 10)
on conflict (id) do update
  set kind = excluded.kind, name = excluded.name, slot = excluded.slot, rarity_or_tier = excluded.rarity_or_tier,
      price = excluded.price, retired = false;
update shop_items set retired = true where id = 't-old';

do $$
declare
  alice  uuid := 'a11ce000-0000-4000-8000-0000000000e1';
  bob    uuid := 'b0b00000-0000-4000-8000-0000000000e2';
  pid    uuid;
  dev    uuid;
  tzp    uuid;
  wp     uuid;
  leg    uuid;
  leg2   uuid;
  rec    jsonb;
  s      jsonb;
  s2     jsonb;
  q      jsonb;
  ids    text[];
  defs   text[];
  defs2  text[];
  a1     uuid;
  a2     uuid;
  bal    bigint;
  team   uuid;
  solo   uuid;
  mate   uuid;
  r      text;
  n      integer;
  wk     text[];
begin
  -- ---- The browser can't touch the tables or the internals ----
  assert not has_table_privilege('anon', 'points_ledger', 'select'), 'anon cannot read the ledger';
  assert not has_table_privilege('authenticated', 'points_ledger', 'insert'), 'authenticated cannot write the ledger';
  assert not has_table_privilege('authenticated', 'quest_assignments', 'update'), 'authenticated cannot edit quests';
  assert not has_table_privilege('anon', 'inventory', 'insert'), 'anon cannot add items';
  assert not has_function_privilege('anon', 'economy_now()', 'execute'), 'anon cannot call economy_now';
  assert not has_function_privilege('authenticated', 'economy_import_legacy()', 'execute'), 'import is internal';
  assert not has_function_privilege('authenticated', 'economy_issue(uuid)', 'execute'), 'issue is internal';
  assert has_function_privilege('anon', 'economy_state(uuid)', 'execute'), 'anon (device accounts) can load state';
  assert has_function_privilege('authenticated', 'economy_claim(uuid, uuid)', 'execute'), 'users can claim';

  -- The test clock works here (postgres session), and falls back to now() when unset.
  perform pg_temp.at('');
  assert abs(extract(epoch from economy_now() - now())) < 1, 'economy_now() = now() without the test setting';
  perform pg_temp.at('2026-11-23 10:00:00+00');   -- Monday of ISO week 48
  assert economy_now() = '2026-11-23 10:00:00+00', 'test clock';

  -- ---- Alice: a signed-in Local with food + art interests who uses a wheelchair ----
  insert into auth.users (id, email) values (alice, 'alice@example.test'), (bob, 'bob@example.test');
  perform pg_temp.act_as(alice);
  pid := (migo_create_account('Alice', 'star') ->> 'id')::uuid;
  rec := jsonb_build_object(
    'accountId', pid::text, 'activeMode', 'local', 'universalCompletedAt', 1764000000000,
    'universal', jsonb_build_object(
      'homeCity', 'Montréal', 'interests', jsonb_build_array('food', 'art'),
      'accessibility', jsonb_build_object('needs', jsonb_build_array('wheelchair'), 'notes', '', 'shareWithMatches', false),
      'exploration', jsonb_build_object('pace', 'relaxed'), 'citiesDiscovered', '[]'::jsonb),
    'tourist', jsonb_build_object('trips', '[]'::jsonb, 'activeTripId', null),
    'local', null,
    'rewards', jsonb_build_object('ledger', '[]'::jsonb, 'owned', '[]'::jsonb, 'equipped', '{}'::jsonb));
  perform migo_save_record(pid, rec);

  s := economy_state(pid);
  assert s ->> 'source' = 'server' and s ->> 'timezone' = 'UTC', 'state basics';
  assert (s ->> 'balance')::int = 0 and (s ->> 'earnedTotal')::int = 0 and (s ->> 'spentTotal')::int = 0, 'starts at zero';
  assert jsonb_array_length(pg_temp.active(s, 'weekly')) = 1, '1 weekly';
  assert jsonb_array_length(pg_temp.active(s, 'daily')) = 3, '3 dailies';
  assert jsonb_array_length(pg_temp.active(s, 'adventure')) = 3, '3 adventures';
  assert jsonb_array_length(pg_temp.active(s, 'starter')) = 2, 'every starter quest once';
  assert pg_temp.active(s, 'weekly') -> 0 ->> 'periodKey' = 'w:2026-W48', 'weekly key';
  assert (select bool_and(x ->> 'periodKey' ~ '^d:2026-11-23:[1-3]$') from jsonb_array_elements(pg_temp.active(s, 'daily')) x), 'daily keys';
  assert (select count(distinct x ->> 'periodKey') from jsonb_array_elements(pg_temp.active(s, 'daily')) x) = 3, 'one daily per slot';
  assert (select bool_and(x ->> 'periodKey' ~ '^a:2026-W48:[1-3]$') from jsonb_array_elements(pg_temp.active(s, 'adventure')) x), 'adventure keys';
  assert (select bool_and(x ->> 'periodKey' = 'starter' and x -> 'expiresAt' = 'null'::jsonb) from jsonb_array_elements(pg_temp.active(s, 'starter')) x), 'starters never expire';
  assert (select count(distinct x ->> 'defId') from jsonb_array_elements(pg_temp.active(s, 'daily')) x) = 3, 'dailies are distinct';
  assert (s ->> 'nextDailyReset')::timestamptz = '2026-11-24 00:00:00+00', 'next daily reset';
  assert (s ->> 'nextWeeklyReset')::timestamptz = '2026-11-30 00:00:00+00', 'next weekly reset';
  assert (pg_temp.active(s, 'daily') -> 0 ->> 'expiresAt')::timestamptz = '2026-11-24 00:00:00+00', 'dailies expire at midnight';
  assert (s -> 'dailyRefreshAvailable')::boolean, 'refresh available';
  assert pg_temp.active(s, 'weekly') -> 0 ->> 'defId' <> 't-w-duo', 'no companion-only weekly before teaming up';

  -- Loading again issues nothing new.
  s2 := economy_state(pid);
  assert (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(s -> 'quests') x)
       = (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(s2 -> 'quests') x), 'state is idempotent';
  assert (select count(*) from quest_assignments where profile_id = pid) = 9, '9 assignments stored';

  -- Personalisation: all three adventures share an interest; never the wheelchair-unsuitable or the
  -- Tourist-only one; the best match first; at most one companion-only, never alone.
  defs := array(select x ->> 'defId' from jsonb_array_elements(pg_temp.active(s, 'adventure')) x);
  assert 't-a-food-art' = any (defs), 'best interest match picked';
  assert 't-a-food' = any (defs), 'pace (relaxed → light) breaks the tie';
  assert not ('t-a-food-stairs' = any (defs)), 'avoid_for respected';
  assert not ('t-a-food-tourist' = any (defs)), 'mode respected';
  assert not ('t-a-sports' = any (defs) or 't-a-music' = any (defs)), 'unrelated interests not picked';
  assert (select count(*) from quest_defs where id = any (defs) and company = 'companion') <= 1, 'at most one companion adventure';

  -- ---- Claims: exactly once, only when finished, reward from the server ----
  q := (select x from jsonb_array_elements(s -> 'quests') x where x ->> 'defId' = 't-s-profile');
  assert (q -> 'claimable')::boolean and (q ->> 'progress')::int = 1 and (q ->> 'reward')::int = 50, 'questionnaire starter claimable';
  s := economy_claim(pid, (q ->> 'id')::uuid);
  assert (s ->> 'balance')::int = 50, 'claim pays the catalogue reward';
  s := economy_claim(pid, (q ->> 'id')::uuid);
  assert (s ->> 'balance')::int = 50, 'second claim pays nothing';
  assert (select count(*) from points_ledger where profile_id = pid and ref = 'quest:' || (q ->> 'id')) = 1, 'one ledger row';
  q := (select x from jsonb_array_elements(s -> 'quests') x where x ->> 'defId' = 't-s-profile');
  assert q ->> 'status' = 'completed' and not (q -> 'claimable')::boolean, 'completed starter shows as done';
  assert (select x ->> 'defId' from jsonb_array_elements(s -> 'history') x limit 1) = 't-s-profile', 'history';
  assert s -> 'recent' -> 0 ->> 'ref' = 'quest:' || (q ->> 'id') and s -> 'recent' -> 0 ->> 'kind' = 'quest', 'recent ledger';

  q := (select x from jsonb_array_elements(s -> 'quests') x where x ->> 'defId' = 't-s-map');
  assert not (q -> 'claimable')::boolean, 'map starter not done yet';
  r := pg_temp.fails(format('select economy_claim(%L, %L)', pid, q ->> 'id'));
  assert r = 'P0001/not_finished', 'unfinished claim refused: ' || r;
  r := pg_temp.fails(format('select economy_claim(%L, %L)', pid, gen_random_uuid()));
  assert r = 'P0002', 'unknown quest: ' || r;

  -- ---- Daily refresh: once a day, a different quest, never a finished one ----
  q := pg_temp.active(s, 'daily') -> 0;
  defs := array(select x ->> 'defId' from jsonb_array_elements(pg_temp.active(s, 'daily')) x);
  s := economy_refresh_daily(pid, (q ->> 'id')::uuid);
  assert (select status from quest_assignments where id = (q ->> 'id')::uuid) = 'replaced', 'old daily replaced';
  assert jsonb_array_length(pg_temp.active(s, 'daily')) = 3, 'still 3 dailies';
  s2 := (select x from jsonb_array_elements(pg_temp.active(s, 'daily')) x where x ->> 'periodKey' = q ->> 'periodKey');
  assert s2 ->> 'id' <> q ->> 'id', 'new assignment in the same slot';
  assert not (s2 ->> 'defId' = any (defs)), 'replacement differs from the replaced and the other dailies';
  assert not (s -> 'dailyRefreshAvailable')::boolean, 'refresh used up';
  assert (s ->> 'balance')::int = 50, 'refresh costs/pays nothing';
  r := pg_temp.fails(format('select economy_refresh_daily(%L, %L)', pid, pg_temp.active(s, 'daily') -> 1 ->> 'id'));
  assert r = 'P0001/refresh_used', 'second refresh today refused: ' || r;
  r := pg_temp.fails(format('select economy_claim(%L, %L)', pid, q ->> 'id'));
  assert r = 'P0001/expired', 'replaced daily cannot be claimed: ' || r;
  r := pg_temp.fails(format('select economy_refresh_daily(%L, %L)', pid, pg_temp.active(s, 'weekly') -> 0 ->> 'id'));
  assert r = '22023', 'only dailies refresh: ' || r;
  defs := array(select def_id from quest_assignments where profile_id = pid and category = 'daily');   -- all 4 of today
  a1 := (pg_temp.active(s, 'daily') -> 0 ->> 'id')::uuid;   -- left unclaimed, for the expiry check

  -- ---- Next day: new dailies, none of yesterday's; finished ones can't be refreshed ----
  perform pg_temp.at('2026-11-24 10:00:00+00');
  s := economy_state(pid);
  assert (select status from quest_assignments where id = a1) = 'expired', 'yesterday''s daily expired';
  r := pg_temp.fails(format('select economy_claim(%L, %L)', pid, a1));
  assert r = 'P0001/expired', 'expired daily cannot be claimed: ' || r;
  assert jsonb_array_length(pg_temp.active(s, 'daily')) = 3, '3 new dailies';
  defs2 := array(select x ->> 'defId' from jsonb_array_elements(pg_temp.active(s, 'daily')) x);
  assert not (defs2 && defs), 'no daily repeats yesterday''s';
  assert (s -> 'dailyRefreshAvailable')::boolean, 'a new refresh every day';
  assert pg_temp.active(s, 'weekly') -> 0 ->> 'periodKey' = 'w:2026-W48', 'same weekly all week';

  r := pg_temp.fails(format('select economy_record_visit(%L, %L)', pid, 'admin'));
  assert r = '22023', 'unknown page refused: ' || r;
  perform economy_record_visit(pid, 'map');
  perform economy_record_visit(pid, 'map');
  perform economy_record_visit(pid, 'chat');
  perform economy_record_visit(pid, 'gallery');
  perform economy_record_visit(pid, 'shop');
  perform economy_record_visit(pid, 'quests');
  assert (select count(*) from app_visits where profile_id = pid) = 5, 'visits stored once per page';
  s := economy_state(pid);
  q := (select x from jsonb_array_elements(s -> 'quests') x where x ->> 'defId' = 't-s-map');
  s := economy_claim(pid, (q ->> 'id')::uuid);
  assert (s ->> 'balance')::int = 75, 'visit starter paid';

  q := (select x from jsonb_array_elements(pg_temp.active(s, 'daily')) x where (x -> 'claimable')::boolean limit 1);
  assert q is not null, 'a visit daily is claimable today';
  r := pg_temp.fails(format('select economy_refresh_daily(%L, %L)', pid, q ->> 'id'));
  assert r = 'P0001/claimable', 'a finished daily cannot be refreshed: ' || r;
  bal := (s ->> 'balance')::int;
  s := economy_claim(pid, (q ->> 'id')::uuid);
  assert (s ->> 'balance')::int = bal + (select reward from quest_defs where id = q ->> 'defId'), 'daily paid its catalogue reward';
  s := economy_claim(pid, (q ->> 'id')::uuid);
  assert (s ->> 'balance')::int = bal + (select reward from quest_defs where id = q ->> 'defId'), 'daily paid once';
  r := pg_temp.fails(format('select economy_refresh_daily(%L, %L)', pid, q ->> 'id'));
  assert r = 'P0001/completed', 'a claimed daily cannot be refreshed: ' || r;

  -- Old app versions see the same numbers in the saved record (read-only mirror).
  rec := migo_get_profile(pid) -> 'record';
  assert (select sum((e ->> 'amount')::int) from jsonb_array_elements(rec #> '{rewards,ledger}') e) = (s ->> 'balance')::int,
    'mirror ledger sums to the balance';

  -- ---- Shop: server prices, never twice, never below zero, never auto-equipped ----
  bal := pg_temp.balance(pid);
  s := economy_purchase(pid, 't-hat');
  assert (s ->> 'balance')::int = bal - 60, 'price from shop_items';
  assert s -> 'owned' ? 't-hat' and s -> 'equipped' = '{}'::jsonb, 'owned, not equipped';
  assert (s ->> 'spentTotal')::int = 60, 'spent total';
  s := economy_purchase(pid, 't-hat');
  assert (s ->> 'balance')::int = bal - 60, 'buying again charges nothing';
  assert (select count(*) from points_ledger where profile_id = pid and ref = 'purchase:t-hat') = 1, 'one purchase row';
  r := pg_temp.fails(format('select economy_purchase(%L, %L)', pid, 't-gown'));
  assert r = 'P0001/insufficient_points', 'too expensive: ' || r;
  r := pg_temp.fails(format('select economy_purchase(%L, %L)', pid, 't-old'));
  assert r = '22023', 'retired items are not sold: ' || r;
  r := pg_temp.fails(format('select economy_purchase(%L, %L)', pid, 'no-such-item'));
  assert r = 'P0002', 'unknown item: ' || r;
  assert pg_temp.balance(pid) = bal - 60, 'failed purchases changed nothing';

  r := pg_temp.fails(format('select economy_equip(%L, %L, %L)', pid, 'face', 't-hat'));
  assert r = '22023', 'wrong slot refused: ' || r;
  r := pg_temp.fails(format('select economy_equip(%L, %L, %L)', pid, 'face', 't-specs'));
  assert r = 'P0001/not_owned', 'unowned item refused: ' || r;
  r := pg_temp.fails(format('select economy_equip(%L, %L, %L)', pid, 'pocket', 't-hat'));
  assert r = '22023', 'unknown slot refused: ' || r;
  s := economy_equip(pid, 'head', 't-hat');
  assert s -> 'equipped' = '{"head": "t-hat"}'::jsonb, 'equipped';
  s := economy_equip(pid, 'head', null);
  assert s -> 'equipped' = '{}'::jsonb, 'unequipped';
  s := economy_equip(pid, 'head', 't-hat');

  -- The balance can't go negative even by writing the ledger directly, and rows can't be edited.
  bal := pg_temp.balance(pid);
  r := pg_temp.fails(format($q$insert into points_ledger (profile_id, amount, kind, ref, label)
                               values (%L, %s, 'adjustment', 'test:drain', 'x')$q$, pid, -(bal + 1)));
  assert r = '23514/insufficient_points', 'negative balance impossible: ' || r;
  r := pg_temp.fails(format($q$update points_ledger set amount = 100000 where profile_id = %L$q$, pid));
  assert r = '42501', 'ledger rows are immutable: ' || r;
  assert pg_temp.balance(pid) = bal, 'balance unchanged';

  -- ---- migo_save_record can't inject points or items ----
  rec := rec || jsonb_build_object('rewards', jsonb_build_object(
    'ledger', jsonb_build_array(jsonb_build_object('id', 'x', 'amount', 99999, 'reason', 'challenge', 'refId', 'challenge:free', 'label', 'Free', 'at', 1)),
    'owned', jsonb_build_array('t-hat', 't-gown'),
    'equipped', jsonb_build_object('back', 't-gown')));
  perform migo_save_record(pid, rec);
  s := economy_state(pid);
  assert (s ->> 'balance')::bigint = bal, 'saved record did not change the balance';
  assert not (s -> 'owned' ? 't-gown') and s -> 'equipped' = '{"head": "t-hat"}'::jsonb, 'saved record did not add items';
  rec := migo_get_profile(pid) -> 'record';
  assert (select sum((e ->> 'amount')::int) from jsonb_array_elements(rec #> '{rewards,ledger}') e) = bal, 'stored mirror replaced the fake ledger';
  assert rec #> '{rewards,owned}' = '["t-hat"]'::jsonb and rec #> '{rewards,equipped}' = '{"head": "t-hat"}'::jsonb, 'stored mirror items';
  assert not exists (select 1 from jsonb_array_elements(rec #> '{rewards,ledger}') e where e ->> 'refId' = 'challenge:free'), 'fake entry gone';

  -- ---- Progress is computed from stored data ----
  -- Hunts: a two-person team counts for withPartner, a solo team doesn't.
  insert into profiles (name, avatar) values ('Mate', 'banana') returning id into mate;
  insert into teams (name) values ('Duo') returning id into team;
  insert into teams (name) values ('Solo') returning id into solo;
  insert into team_members (team_id, profile_id) values (team, pid), (team, mate), (solo, pid);
  insert into submissions (team_id, hunt_id, seconds_left, find_rank, base, speed_bonus, met_someone_bonus, first_finder_bonus, total, created_at)
  select solo, id, 10, 1, 1, 0, 0, 0, 1, '2026-11-24 09:00+00' from hunts order by id limit 1;
  assert economy_progress(pid, rec, '{"type":"hunts","count":1}', '2026-11-24', '2026-11-25') = 1, 'solo hunt counts';
  assert economy_progress(pid, rec, '{"type":"hunts","count":1,"withPartner":true}', '2026-11-24', '2026-11-25') = 0, 'solo hunt is not withPartner';
  assert not economy_has_teamed_up(pid), 'not teamed up yet';
  insert into submissions (team_id, hunt_id, seconds_left, find_rank, base, speed_bonus, met_someone_bonus, first_finder_bonus, total, created_at)
  select team, id, 10, 1, 1, 0, 0, 0, 1, '2026-11-24 09:30+00' from hunts order by id limit 1;
  assert economy_progress(pid, rec, '{"type":"hunts","count":1,"withPartner":true}', '2026-11-24', '2026-11-25') = 1, 'duo hunt is withPartner';
  assert economy_progress(pid, rec, '{"type":"hunts","count":2,"distinctHunts":true}', '2026-11-24', '2026-11-25') = 1, 'distinct hunts';
  assert economy_progress(pid, rec, '{"type":"hunts","count":2}', '2026-11-24', '2026-11-25') = 2, 'all hunts';
  assert economy_progress(pid, rec, '{"type":"hunts","count":1}', '2026-11-25', '2026-11-26') = 0, 'hunts outside the period';
  assert economy_has_teamed_up(pid), 'teamed up';
  -- Photos (upload time) and distinct cities: the first photo per city, then the rest of count.
  insert into photos (profile_id, storage_path, city_name, place_id, created_at) values
    (pid, alice::text || '/p1.jpg', 'Lisbon', 'geonames:2267057', '2026-11-24 08:00+00'),
    (pid, alice::text || '/p2.jpg', 'Lisbon', 'geonames:2267057', '2026-11-24 08:10+00'),
    (pid, alice::text || '/p3.jpg', 'Lisbon', 'geonames:2267057', '2026-11-24 08:20+00'),
    (pid, alice::text || '/p4.jpg', null, null, '2026-11-24 08:30+00'),
    (pid, alice::text || '/p5.jpg', 'Porto', 'geonames:2735943', '2026-11-20 08:00+00');
  assert economy_progress(pid, rec, '{"type":"photos","count":4}', '2026-11-24', '2026-11-25') = 4, 'photos in period';
  assert economy_progress(pid, rec, '{"type":"photos","count":4,"requireCity":true}', '2026-11-24', '2026-11-25') = 3, 'requireCity';
  assert economy_progress(pid, rec, '{"type":"photos","count":4,"distinctCities":2}', '2026-11-24', '2026-11-25') = 3, 'one city: 1 + 2';
  assert economy_progress(pid, rec, '{"type":"photos","count":3,"distinctCities":3}', '2026-11-24', '2026-11-25') = 1, '3 cities needed, 1 so far';
  assert economy_progress(pid, rec, '{"type":"photos","count":4,"distinctCities":2}', '2026-11-16', '2026-11-25') = 4, 'two cities';
  assert economy_target('{"type":"photos","count":3,"distinctCities":5}') = 5, 'photos target = max(count, distinctCities)';
  -- New cities: pinned, still listed, addedAt in the period AND first seen by the server in it.
  rec := jsonb_set(rec, '{universal,citiesDiscovered}', jsonb_build_array(
    jsonb_build_object('id', 'c1', 'name', 'Lisbon', 'placeId', 'geonames:2267057', 'addedAt', 1795514400000),   -- 2026-11-24 10:00Z
    jsonb_build_object('id', 'c2', 'name', 'Typed', 'placeId', null, 'addedAt', 1795514400000)));
  perform migo_save_record(pid, rec);
  rec := economy_record(pid);
  assert economy_progress(pid, rec, '{"type":"new_cities","count":1}', '2026-11-24', '2026-11-25') = 1, 'new pinned city';
  assert economy_progress(pid, rec, '{"type":"new_cities","count":1}', '2026-11-25', '2026-11-26') = 0, 'not new next day';
  update seen_cities set first_seen_at = '2026-10-01' where profile_id = pid;   -- seen long ago
  assert economy_progress(pid, rec, '{"type":"new_cities","count":1}', '2026-11-24', '2026-11-25') = 0,
    'a city the server saw before does not count again (client addedAt is not enough)';
  rec := jsonb_set(rec, '{universal,citiesDiscovered}', '[]'::jsonb);
  perform migo_save_record(pid, rec);
  assert economy_progress(pid, economy_record(pid), '{"type":"profile","check":"first_city"}', null, null) = 0, 'no city';

  -- ---- Next week: the 3 adventures not shown last week; weekly changes ----
  perform pg_temp.at('2026-11-30 10:00:00+00');
  defs := array(select def_id from quest_assignments where profile_id = pid and category = 'adventure');
  s := economy_state(pid);
  assert pg_temp.active(s, 'weekly') -> 0 ->> 'periodKey' = 'w:2026-W49', 'new week';
  defs2 := array(select x ->> 'defId' from jsonb_array_elements(pg_temp.active(s, 'adventure')) x);
  assert cardinality(defs2) = 3 and not (defs2 && defs), 'adventures shown last week are not repeated: ' || defs2::text;
  assert not ('t-a-food-stairs' = any (defs2) or 't-a-food-tourist' = any (defs2)), 'hard filters hold when the pool is small';
  assert (select count(*) from quest_assignments where profile_id = pid and category = 'adventure' and period_key = 'a:2026-W48' and status = 'expired') = 3,
    'last week''s adventures expired';

  -- ---- Owner rule: another login, or no login, gets 42501 everywhere ----
  for i in 1..2 loop
    perform pg_temp.act_as(case when i = 1 then bob end);
    assert pg_temp.fails(format('select economy_state(%L)', pid)) = '42501', 'state refused ' || i;
    assert pg_temp.fails(format('select economy_claim(%L, %L)', pid, a1)) = '42501', 'claim refused ' || i;
    assert pg_temp.fails(format('select economy_refresh_daily(%L, %L)', pid, a1)) = '42501', 'refresh refused ' || i;
    assert pg_temp.fails(format('select economy_purchase(%L, %L)', pid, 't-specs')) = '42501', 'purchase refused ' || i;
    assert pg_temp.fails(format('select economy_equip(%L, %L, null)', pid, 'head')) = '42501', 'equip refused ' || i;
    assert pg_temp.fails(format('select economy_record_visit(%L, %L)', pid, 'map')) = '42501', 'visit refused ' || i;
    assert pg_temp.fails(format('select economy_set_timezone(%L, %L)', pid, 'Europe/Paris')) = '42501', 'timezone refused ' || i;
  end loop;
  assert (select timezone from profiles where id = pid) = 'UTC', 'nothing changed by others';
  assert pg_temp.fails(format('select economy_state(%L)', gen_random_uuid())) = 'P0002', 'unknown profile';

  -- ---- Device account (no login): works the same, for anyone holding its id ----
  perform pg_temp.act_as(null);
  dev := (migo_create_account('Device', 'banana') ->> 'id')::uuid;
  perform migo_save_record(dev, jsonb_build_object('accountId', dev::text, 'activeMode', 'tourist'));
  s := economy_state(dev);
  assert jsonb_array_length(pg_temp.active(s, 'daily')) = 3, 'device account gets dailies';
  assert jsonb_array_length(pg_temp.active(s, 'adventure')) <= 3, 'device account adventures';
  assert not exists (select 1 from quest_assignments a join quest_defs d on d.id = a.def_id
                      where a.profile_id = dev and 'local' = any (d.modes)), 'tourist gets no local-only quests';
  r := pg_temp.fails(format('select economy_purchase(%L, %L)', dev, 't-specs'));
  assert r = 'P0001/insufficient_points', 'device account has no free points: ' || r;

  -- ---- Companion-only quests are never the only option ----
  update quest_defs set retired = true where category = 'adventure' and id not in ('t-a-food-duo', 't-a-sports');
  insert into quest_defs (id, category, title, reward, condition, company) values
    ('t-a-duo2', 'adventure', 'A duo 2', 200, '{"type":"hunts","count":1,"withPartner":true}', 'companion')
  on conflict (id) do update set retired = false, company = 'companion', category = 'adventure';
  perform pg_temp.act_as(null);
  tzp := (migo_create_account('Comp', 'flower') ->> 'id')::uuid;
  s := economy_state(tzp);
  defs := array(select x ->> 'defId' from jsonb_array_elements(pg_temp.active(s, 'adventure')) x);
  assert cardinality(defs) = 2 and 't-a-sports' = any (defs), 'one companion + one solo: ' || defs::text;
  update quest_defs set retired = true where id = 't-a-sports';
  wp := (migo_create_account('Comp2', 'flower') ->> 'id')::uuid;
  s := economy_state(wp);
  assert jsonb_array_length(pg_temp.active(s, 'adventure')) = 0, 'a companion quest alone is not offered';
  update quest_defs set retired = false where id like 't-a-%' and id <> 't-a-duo2';
  update quest_defs set retired = true where id = 't-a-duo2';

  -- ---- A refresh never swaps in a daily that is already finished today ----
  update quest_defs set retired = true where category = 'daily' and id not in ('t-d-map', 't-d-chat', 't-d-gallery', 't-d-shop');
  perform pg_temp.act_as(null);
  dev := (migo_create_account('Refresher', 'star') ->> 'id')::uuid;
  s := economy_state(dev);
  defs := array(select x ->> 'defId' from jsonb_array_elements(pg_temp.active(s, 'daily')) x);
  r := (select id from quest_defs where id in ('t-d-map', 't-d-chat', 't-d-gallery', 't-d-shop') and not (id = any (defs)));
  -- Finish the only possible replacement (open its page) but none of today's three.
  perform economy_record_visit(dev, (select condition ->> 'page' from quest_defs where id = r));
  s := economy_state(dev);
  assert not exists (select 1 from jsonb_array_elements(pg_temp.active(s, 'daily')) x where (x -> 'claimable')::boolean), 'none of today''s is finished';
  q := pg_temp.active(s, 'daily') -> 0;
  r := pg_temp.fails(format('select economy_refresh_daily(%L, %L)', dev, q ->> 'id'));
  assert r = 'P0001/none_available', 'an instantly claimable replacement is never offered: ' || r;
  s := economy_state(dev);
  assert (s -> 'dailyRefreshAvailable')::boolean and not exists (select 1 from daily_refreshes where profile_id = dev),
    'a failed refresh is not used up';
  assert (select status from quest_assignments where id = (q ->> 'id')::uuid) = 'active', 'the daily stays';
  update quest_defs set retired = false where id = 't-d-quests';
  s := economy_refresh_daily(dev, (q ->> 'id')::uuid);
  q := (select x from jsonb_array_elements(pg_temp.active(s, 'daily')) x where x ->> 'periodKey' = q ->> 'periodKey');
  assert q ->> 'defId' = 't-d-quests' and (q ->> 'progress')::int = 0 and not (q -> 'claimable')::boolean,
    'the replacement is an unfinished one';
  update quest_defs set retired = false where id like 't-d-%';

  -- ---- Timezones: periods follow the saved zone, and switching can't re-issue a day ----
  perform pg_temp.at('2026-11-24 02:00:00+00');
  tzp := (migo_create_account('Zone', 'star') ->> 'id')::uuid;
  s := economy_state(tzp);
  ids := array(select x ->> 'id' from jsonb_array_elements(pg_temp.active(s, 'daily')) x order by 1);
  assert (select bool_and(x ->> 'periodKey' like 'd:2026-11-24:%') from jsonb_array_elements(pg_temp.active(s, 'daily')) x), 'UTC day 24';
  r := pg_temp.fails(format('select economy_set_timezone(%L, %L)', tzp, 'Mars/Olympus_Mons'));
  assert r = '22023', 'unknown timezone refused: ' || r;
  perform economy_set_timezone(tzp, 'America/Los_Angeles');      -- first change: allowed. Local: Nov 23, 18:00
  s := economy_state(tzp);
  assert s ->> 'timezone' = 'America/Los_Angeles', 'timezone saved';
  assert array(select x ->> 'id' from jsonb_array_elements(pg_temp.active(s, 'daily')) x order by 1) = ids,
    'moving west keeps the same dailies';
  assert not exists (select 1 from quest_assignments where profile_id = tzp and period_key = 'd:2026-11-23'), 'yesterday is never issued';
  assert (s ->> 'nextDailyReset')::timestamptz = '2026-11-25 08:00:00+00', 'day ends at midnight in Los Angeles';
  assert (pg_temp.active(s, 'daily') -> 0 ->> 'expiresAt')::timestamptz = '2026-11-25 08:00:00+00', 'quest windows moved too';
  r := pg_temp.fails(format('select economy_set_timezone(%L, %L)', tzp, 'Asia/Tokyo'));
  assert r = 'P0001/timezone_rate_limited', 'second change within 20 hours refused: ' || r;
  perform economy_set_timezone(tzp, 'America/Los_Angeles');      -- same zone: a no-op, allowed

  perform pg_temp.at('2026-11-24 23:00:00+00');                   -- 21 hours later; Los Angeles: Nov 24, 15:00
  s := economy_state(tzp);
  assert array(select x ->> 'id' from jsonb_array_elements(pg_temp.active(s, 'daily')) x order by 1) = ids, 'still day 24';
  perform economy_set_timezone(tzp, 'Asia/Tokyo');                -- Tokyo: Nov 25, 08:00
  s := economy_state(tzp);
  assert (select bool_and(x ->> 'periodKey' like 'd:2026-11-25:%') from jsonb_array_elements(pg_temp.active(s, 'daily')) x)
     and jsonb_array_length(pg_temp.active(s, 'daily')) = 3, 'moving east starts the next day';
  assert (select count(*) from quest_assignments where profile_id = tzp and period_key = 'd:2026-11-24' and status = 'expired') = 3, 'day 24 over';

  perform pg_temp.at('2026-11-25 20:00:00+00');                   -- 21 hours later; Los Angeles: Nov 25, 12:00
  perform economy_set_timezone(tzp, 'America/Los_Angeles');
  s := economy_state(tzp);
  assert (select count(*) from quest_assignments where profile_id = tzp and category = 'daily' and period_key = 'd:2026-11-25') = 3,
    'switching back does not re-issue day 25';
  assert (select count(distinct period_key) from quest_assignments where profile_id = tzp and category = 'daily') = 2,
    'only two days ever issued (24 and 25)';
  assert jsonb_array_length(pg_temp.active(s, 'daily')) = 3, 'day 25 still active';
  assert (s ->> 'nextDailyReset')::timestamptz = '2026-11-26 08:00:00+00', 'resets at Los Angeles midnight';

  -- ---- Weekly: not repeated within 4 weeks ----
  perform pg_temp.at('2026-12-07 10:00:00+00');
  wp := (migo_create_account('Weeks', 'star') ->> 'id')::uuid;
  wk := '{}';
  for i in 0..2 loop
    perform pg_temp.at((timestamptz '2026-12-07 10:00:00+00' + i * interval '7 days')::text);
    s := economy_state(wp);
    wk := wk || (pg_temp.active(s, 'weekly') -> 0 ->> 'defId');
  end loop;
  assert (select count(distinct x) from unnest(wk) x) = 3, 'three different weeklies in a row: ' || wk::text;
  assert not ('t-w-duo' = any (wk)), 'no companion weekly for someone who never teamed up';

  -- ---- Legacy import: old record.rewards carried over with identical balances ----
  perform pg_temp.at('2026-11-23 10:00:00+00');
  insert into quest_defs (id, category, title, reward, condition) values
    ('starter-profile', 'starter', 'Hello, explorer', 50, '{"type":"profile","check":"questionnaire_complete"}')
  on conflict (id) do update set retired = false, category = 'starter', condition = excluded.condition;
  insert into profiles (name, avatar) values ('Legacy', 'star') returning id into leg;
  insert into profiles (name, avatar) values ('Broken', 'star') returning id into leg2;
  -- Written straight into the table, as 004/005 used to save it.
  insert into migo_profiles (profile_id, record) values
    (leg, jsonb_build_object('accountId', leg::text, 'universalCompletedAt', 1, 'universal', jsonb_build_object('homeCity', 'Lisbon'),
      'rewards', jsonb_build_object(
        'ledger', jsonb_build_array(
          jsonb_build_object('id', 'e1', 'amount', 50, 'reason', 'challenge', 'refId', 'challenge:starter-profile:once', 'label', 'Hello, explorer', 'at', 1763000000000),
          jsonb_build_object('id', 'e2', 'amount', 50, 'reason', 'challenge', 'refId', 'challenge:daily-hunt:2026-11-12', 'label', 'Hunt of the day', 'at', 1763000100000),
          jsonb_build_object('id', 'e3', 'amount', 50, 'reason', 'challenge', 'refId', 'challenge:daily-hunt:2026-11-12', 'label', 'Hunt of the day (again)', 'at', 1763000200000),
          jsonb_build_object('id', 'e4', 'amount', -100, 'reason', 'purchase', 'refId', 'item:shades', 'label', 'Sunnies', 'at', 1763000300000),
          jsonb_build_object('id', 'e5', 'amount', 100, 'reason', 'challenge', 'refId', 'challenge:starter-two-modes:once', 'label', 'Two ways', 'at', 1763000400000),
          '"junk"'::jsonb),
        'owned', jsonb_build_array('shades', 'scarf', 42),
        'equipped', jsonb_build_object('face', 'shades', 'neck', 'bow-tie')))),
    (leg2, jsonb_build_object('accountId', leg2::text,
      'rewards', jsonb_build_object('ledger', jsonb_build_array(
        jsonb_build_object('id', 'e1', 'amount', -40, 'reason', 'purchase', 'refId', 'item:beret', 'label', 'Beret', 'at', 1763000000000)))));
  n := (select count(*) from migo_profiles mp where not exists (select 1 from legacy_imports li where li.profile_id = mp.profile_id));
  assert economy_import_legacy() = n and n >= 2, 'every profile not imported yet is imported';
  assert exists (select 1 from legacy_imports where profile_id = leg), 'marked as imported';
  assert pg_temp.balance(leg) = 150, 'legacy balance identical (50+50+50-100+100)';
  assert (select count(*) from points_ledger where profile_id = leg and kind = 'legacy') = 5, 'every entry kept (duplicate refId too)';
  assert exists (select 1 from points_ledger where profile_id = leg and ref = 'legacy:challenge:daily-hunt:2026-11-12#2'), 'duplicate ref suffixed';
  assert (select created_at from points_ledger where profile_id = leg and ref = 'legacy:item:shades') = to_timestamp(1763000300), 'timestamps kept';
  assert (select price_paid from inventory where profile_id = leg and item_id = 'shades') = 100, 'price paid from the old purchase';
  assert (select price_paid from inventory where profile_id = leg and item_id = 'scarf') = 0, 'unknown price = 0';
  assert (select count(*) from inventory where profile_id = leg) = 2, 'junk owned ids skipped';
  assert (select item_id from equipped where profile_id = leg and slot = 'face') = 'shades', 'equipped kept';
  assert not exists (select 1 from equipped where profile_id = leg and slot = 'neck'), 'unowned equipped item dropped';
  assert pg_temp.balance(leg2) = 0 and exists (select 1 from points_ledger where profile_id = leg2 and kind = 'adjustment'),
    'a tampered negative ledger is brought to zero';
  assert (select record #> '{rewards,ledger}' @> '[{"refId": "challenge:starter-profile:once"}]' from migo_profiles where profile_id = leg),
    'mirror keeps old refIds for old app versions';
  assert (select sum((e ->> 'amount')::int) from migo_profiles, jsonb_array_elements(record #> '{rewards,ledger}') e where profile_id = leg) = 150,
    'mirror sums to the same balance';
  -- Running it again imports nothing, even though the record now holds the mirror.
  assert economy_import_legacy() = 0, 'import is idempotent';
  assert pg_temp.balance(leg) = 150, 'balance unchanged after re-import';
  -- The old starter claim counts: the new starter quest shows as done and pays nothing more.
  s := economy_state(leg);
  q := (select x from jsonb_array_elements(s -> 'quests') x where x ->> 'defId' = 'starter-profile');
  assert q ->> 'status' = 'completed' and (q ->> 'reward')::int = 50, 'legacy starter claim honoured';
  s := economy_claim(leg, (q ->> 'id')::uuid);
  assert (s ->> 'balance')::int = 150, 'legacy claim not paid twice';
  assert (s ->> 'earnedTotal')::int = 250 and (s ->> 'spentTotal')::int = 100, 'totals';

  raise notice 'All economy checks passed';
end;
$$;

rollback;
