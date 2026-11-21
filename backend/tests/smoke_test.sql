-- Smoke test for the backend. Run against a database with 001 and 002 applied:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/tests/smoke_test.sql
-- Everything runs in a transaction and is rolled back, so it leaves no data behind.
-- Any failed check raises an error.

begin;

do $$
declare
  tourist  profiles;
  loc      profiles;
  dog_fan  profiles;
  team     jsonb;
  team2    jsonb;
  result   jsonb;
  first_hunt text;
begin
  -- Distance: Roddick Gates to Three Bares is roughly 70 m.
  if distance_m(45.5048, -73.5772, 45.5045, -73.5780) not between 50 and 90 then
    raise exception 'distance_m looks wrong: %', distance_m(45.5048, -73.5772, 45.5045, -73.5780);
  end if;

  -- Onboarding
  tourist := create_profile('Test Tourist', '🦊', 'tourist');
  dog_fan := create_profile('Dog Local', '🐸', 'local', 'Has a dog', true, '{mobility}');

  -- Matching: a tourist gets a waiting local (one of the seeded locals).
  team := find_partner(tourist.id);
  if team is null then raise exception 'tourist should have been matched'; end if;
  if jsonb_array_length(team->'members') <> 2 then raise exception 'team should have 2 members: %', team; end if;
  if (select count(*) from jsonb_array_elements(team->'members') m where m->>'role' = 'local') <> 1 then
    raise exception 'team should have one local: %', team;
  end if;

  -- Calling again returns the same team (safe to poll).
  team2 := find_partner(tourist.id);
  if team2->>'id' <> team->>'id' then raise exception 'find_partner is not idempotent'; end if;

  -- Hunts: nearest first. Standing at the Cohen mural, it should come first.
  select id into first_hunt from get_hunts(tourist.id, 45.4986, -73.5783) limit 1;
  if first_hunt <> 'leonard-cohen-mural' then raise exception 'nearest hunt wrong: %', first_hunt; end if;

  -- Dog park hunts are hidden from non dog owners.
  insert into hunts (id, title, photo, lat, lng, time_limit_sec, base_points, difficulty, reveal_text, kind)
  values ('test-dog-park', 'Test dog park', '/x.jpg', 45.5, -73.58, 600, 100, 'easy', 'x', 'dog-park');
  if exists (select 1 from get_hunts(tourist.id) where id = 'test-dog-park') then
    raise exception 'dog park shown to a player without a dog';
  end if;
  if not exists (select 1 from get_hunts(dog_fan.id) where id = 'test-dog-park') then
    raise exception 'dog park hidden from a dog owner';
  end if;

  -- Too far away: rejected.
  begin
    perform submit_selfie((team->>'id')::uuid, 'roddick-gates', 300, 45.5100, -73.5700);
    raise exception 'far submission should have failed';
  exception when raise_exception then
    if sqlerrm not like 'Not at the spot yet%' then raise; end if;
  end;

  -- At the spot with half the time left: 100 base + 25 speed + 50 met + 100 first finder = 275.
  result := submit_selfie((team->>'id')::uuid, 'roddick-gates', 300, 45.5048, -73.5772);
  if (result->>'total')::int <> 275 or (result->>'findRank')::int <> 1 then
    raise exception 'unexpected score: %', result;
  end if;

  -- Submitting twice doesn't score twice.
  result := submit_selfie((team->>'id')::uuid, 'roddick-gates', 300, 45.5048, -73.5772);
  if not (result->>'alreadySubmitted')::boolean or (result->>'total')::int <> 275 then
    raise exception 'double submit should return the original score: %', result;
  end if;

  -- Second team to find it gets the smaller first finder bonus (demo mode skips GPS).
  loc := create_profile('Test Local', '🐼', 'local');
  team2 := find_partner(loc.id);
  if team2 is null then raise exception 'local should have been matched'; end if;
  result := submit_selfie((team2->>'id')::uuid, 'roddick-gates', 0, null, null, null, true);
  if (result->>'firstFinderBonus')::int <> 50 or (result->>'total')::int <> 200 then
    raise exception 'second finder score wrong: %', result;
  end if;

  -- Leaderboard includes the new team with its points.
  if (select points from leaderboard where id = (team->>'id')::uuid) <> 275 then
    raise exception 'leaderboard points wrong';
  end if;

  raise notice 'All backend checks passed';
end;
$$;

rollback;
