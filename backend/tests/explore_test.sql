-- Checks 007_landmarks_geofencing.sql end to end on the database side. Rolls back: nothing is kept.
-- Run in the Supabase SQL editor after 007, 008 (boundary) and 009 (seed). Prints
-- "All exploration checks passed".
--
-- Uses its own test landmarks (the real catalogue is switched off inside this transaction only), so
-- results don't depend on the imported data. Covers the PRD scenarios:
--   1 first visit · 2 no landmark (Montréal memory) · 3 repeat visit stays unique · 4 poor/stale GPS
--   5 outside the island · 6 full catalogue with recommended flags · plus overlaps, polygons,
--   ownership/RLS, rate limit and delete.
begin;

create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    case when p_user is null then '' else
                      jsonb_build_object('sub', p_user, 'role', 'authenticated')::text end, true),
         set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
$$;

create or replace function pg_temp.fails_with(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return '';
exception when others then
  return sqlstate;
end;
$$;

-- Same, but returns the HINT (register_capture puts retry / outside_area / needs_choice there).
create or replace function pg_temp.hint_of(p_sql text) returns text language plpgsql as $$
declare
  h text;
begin
  execute p_sql;
  return '';
exception when others then
  get stacked diagnostics h = pg_exception_hint;
  return coalesce(h, '');
end;
$$;

-- Pretend the file was uploaded (the register function checks storage.objects on Supabase).
create or replace function pg_temp.fake_upload(p_path text) returns void language plpgsql as $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'insert into storage.objects (bucket_id, name) values ($1, $2)' using 'gallery', p_path;
  end if;
end;
$$;

create or replace function pg_temp.reg(p_path text, p_lat double precision, p_lng double precision,
                                       p_acc double precision default 8, p_landmark uuid default null) returns jsonb
language sql as $$
  select explore_register_capture(p_path, p_lat, p_lng, p_acc, now(), now(), p_landmark, 1600, 1200, 250000)
$$;

do $$
declare
  alice  uuid := 'a11ce000-0000-4000-8000-0000000000e1';
  bob    uuid := 'b0b00000-0000-4000-8000-0000000000e2';
  apid   uuid;
  bpid   uuid;
  t_orat uuid;
  t_a    uuid;
  t_b    uuid;
  t_park uuid;
  r      jsonb;
  vw     jsonb;
  p1     uuid;
  n      integer;
begin
  assert exists (select 1 from service_areas where id = 'montreal-island'), 'run 008_montreal_island_boundary.sql first';
  assert (select extname from pg_extension where extname = 'postgis') is not null, 'PostGIS enabled';

  -- Privileges: catalogue readable, everything else only through functions.
  assert has_table_privilege('anon', 'landmarks', 'select'), 'anon can read the catalogue';
  assert not has_table_privilege('authenticated', 'landmarks', 'insert'), 'clients cannot add landmarks';
  assert not has_table_privilege('authenticated', 'landmarks', 'update'), 'clients cannot edit landmarks';
  assert not has_table_privilege('authenticated', 'user_landmark_discoveries', 'insert'), 'clients cannot write visits';
  assert not has_table_privilege('authenticated', 'user_landmark_discoveries', 'select'), 'visits are private';
  assert not has_table_privilege('authenticated', 'landmark_recommendations', 'insert'), 'clients cannot write recommendations';
  assert not has_function_privilege('anon', 'explore_register_capture(text, double precision, double precision, double precision, timestamptz, timestamptz, uuid, integer, integer, integer)', 'execute'), 'anon cannot register';
  assert not has_function_privilege('authenticated', 'explore_evaluate(uuid, double precision, double precision, double precision, timestamptz, timestamptz, integer)', 'execute'), 'internal evaluate is private';
  assert has_function_privilege('anon', 'landmarks_in_view(double precision, double precision, double precision, double precision, integer)', 'execute'), 'anon can browse the map';

  -- Test catalogue only (rolled back).
  update landmarks set is_active = false where is_active;
  insert into landmarks (slug, name, category, latitude, longitude, geofence_radius_m, source_name, source_license, source_record_id)
  values ('test-oratory', 'Test Oratory', 'religious', 45.4925, -73.6178, 150, 'test', 'test', 'orat')
  returning id into t_orat;
  insert into landmarks (slug, name, category, latitude, longitude, geofence_radius_m, source_name, source_license, source_record_id)
  values ('test-a', 'Test Statue A', 'public-art', 45.50000, -73.57000, 60, 'test', 'test', 'a') returning id into t_a;
  insert into landmarks (slug, name, category, latitude, longitude, geofence_radius_m, source_name, source_license, source_record_id)
  values ('test-b', 'Test Statue B', 'public-art', 45.50005, -73.57006, 60, 'test', 'test', 'b') returning id into t_b;
  insert into landmarks (slug, name, category, latitude, longitude, geofence_radius_m, geofence_polygon, source_name, source_license, source_record_id)
  values ('test-park', 'Test Park', 'park', 45.5200, -73.5900, 60,
          extensions.st_multi(extensions.st_geomfromtext('POLYGON((-73.594 45.517,-73.586 45.517,-73.586 45.523,-73.594 45.523,-73.594 45.517))', 4326))::extensions.geography,
          'test', 'test', 'park')
  returning id into t_park;
  assert (select location is not null from landmarks where id = t_orat), 'location filled from lat/lng';

  -- A landmark outside the island is kept but switched off and flagged.
  insert into landmarks (slug, name, category, latitude, longitude, source_name, source_license, source_record_id)
  values ('test-laval', 'Test Laval', 'other', 45.6066, -73.7124, 'test', 'test', 'laval');
  assert (select not is_active and needs_review from landmarks where slug = 'test-laval'), 'outside-island landmark flagged';

  insert into auth.users (id, email) values (alice, 'alice-explore@example.test'), (bob, 'bob-explore@example.test');
  perform pg_temp.act_as(bob);
  bpid := (migo_create_account('Bob', 'fox') ->> 'id')::uuid;
  perform pg_temp.act_as(alice);
  apid := (migo_create_account('Alice', 'owl') ->> 'id')::uuid;

  -- Signed out: no checks, no registration.
  perform pg_temp.act_as(null);
  assert pg_temp.fails_with($q$ select explore_check_location(45.4925, -73.6178, 10, now(), now()) $q$) = '42501', 'signed out cannot check';
  assert jsonb_array_length(landmarks_in_view(-73.7, 45.45, -73.5, 45.55)) = 4, 'signed out still sees the catalogue';
  perform pg_temp.act_as(alice);

  -- Scenario 1: first visit to the Oratory (inside its 150 m circle).
  r := explore_check_location(45.4930, -73.6170, 12, now(), now());
  assert r ->> 'status' = 'ok' and (r ->> 'resolved_landmark_id')::uuid = t_orat, 'oratory resolved: ' || r::text;
  perform pg_temp.fake_upload(alice || '/one.jpg');
  r := pg_temp.reg(alice || '/one.jpg', 45.4930, -73.6170);
  assert r ->> 'association_status' = 'landmark_visit', 'saved as a landmark visit';
  assert (r -> 'landmark' ->> 'id')::uuid = t_orat and (r ->> 'new_discovery')::boolean, 'first discovery';
  p1 := (r ->> 'photo_id')::uuid;
  assert (select lat is null and lng is null from photos where id = p1), 'raw coordinates not stored';
  assert (select gps_accuracy_m = 8 and file_size_bytes = 250000 from photos where id = p1), 'accuracy and size kept';

  -- Scenario 3: repeat visit → new photo, same single discovery.
  perform pg_temp.fake_upload(alice || '/two.jpg');
  r := pg_temp.reg(alice || '/two.jpg', 45.4924, -73.6180);
  assert not (r ->> 'new_discovery')::boolean, 'repeat visit is not new';
  assert (select count(*) from user_landmark_discoveries where profile_id = apid and landmark_id = t_orat) = 1, 'one discovery';
  assert (select count(*) from photos where profile_id = apid and landmark_id = t_orat) = 2, 'two photos';
  assert (select (d ->> 'photo_count')::int from jsonb_array_elements(explore_my_discoveries()) d) = 2, 'discoveries count photos';

  -- Scenario 2: inside Montréal, no geofence → Montréal memory, nothing visited.
  r := explore_check_location(45.4600, -73.6400, 10, now(), now());
  assert r ->> 'status' = 'ok' and r ->> 'resolved_landmark_id' is null and jsonb_array_length(r -> 'candidates') = 0, 'no landmark here';
  perform pg_temp.fake_upload(alice || '/memory.jpg');
  r := pg_temp.reg(alice || '/memory.jpg', 45.4600, -73.6400);
  assert r ->> 'association_status' = 'montreal_unassigned' and r -> 'landmark' = 'null'::jsonb, 'unassigned memory';
  assert (select count(*) from user_landmark_discoveries where profile_id = apid) = 1, 'memory marks nothing visited';

  -- Scenario 4: poor accuracy, stale reading, capture/fix gap, future clock → retry; never associated.
  r := explore_check_location(45.4930, -73.6170, 200, now(), now());
  assert r ->> 'status' = 'retry' and r ->> 'reason' = 'poor_accuracy', 'poor accuracy → retry';
  r := explore_check_location(45.4930, -73.6170, 10, now() - interval '1 hour', now() - interval '1 hour');
  assert r ->> 'reason' = 'stale_position', 'stale → retry';
  r := explore_check_location(45.4930, -73.6170, 10, now() - interval '90 seconds', now());
  assert r ->> 'reason' = 'capture_gap', 'gap → retry';
  r := explore_check_location(45.4930, -73.6170, 10, now() + interval '1 hour', now() + interval '1 hour');
  assert r ->> 'reason' = 'future_timestamp', 'future → retry';
  perform pg_temp.fake_upload(alice || '/fuzzy.jpg');
  assert pg_temp.hint_of(format($q$ select pg_temp.reg(%L, 45.4930, -73.6170, 200) $q$, alice || '/fuzzy.jpg')) = 'retry', 'register refuses poor GPS';
  assert not exists (select 1 from photos where storage_path = alice || '/fuzzy.jpg'), 'nothing saved';

  -- Scenario 5: outside the island.
  r := explore_check_location(45.6066, -73.7124, 10, now(), now());
  assert r ->> 'status' = 'outside_area', 'Laval is outside';
  perform pg_temp.fake_upload(alice || '/laval.jpg');
  assert pg_temp.hint_of(format($q$ select pg_temp.reg(%L, 45.6066, -73.7124) $q$, alice || '/laval.jpg')) = 'outside_area', 'register refuses outside';

  -- Overlapping circles 7 m apart → ambiguous; the user must pick one of the candidates.
  r := explore_check_location(45.50002, -73.57003, 5, now(), now());
  assert (r ->> 'ambiguous')::boolean and r ->> 'resolved_landmark_id' is null, 'ambiguous: ' || r::text;
  assert jsonb_array_length(r -> 'candidates') = 2, 'two candidates';
  perform pg_temp.fake_upload(alice || '/statue.jpg');
  assert pg_temp.hint_of(format($q$ select pg_temp.reg(%L, 45.50002, -73.57003, 5) $q$, alice || '/statue.jpg')) = 'needs_choice', 'needs a choice';
  assert pg_temp.fails_with(format($q$ select pg_temp.reg(%L, 45.50002, -73.57003, 5, %L) $q$, alice || '/statue.jpg', t_orat)) = '22023', 'cannot pick a far place';
  r := pg_temp.reg(alice || '/statue.jpg', 45.50002, -73.57003, 5, t_b);
  assert (r -> 'landmark' ->> 'id')::uuid = t_b, 'picked candidate saved';

  -- Polygon geofence: anywhere inside the park, even 300 m from its anchor point.
  r := explore_check_location(45.5220, -73.5930, 10, now(), now());
  assert (r ->> 'resolved_landmark_id')::uuid = t_park and r -> 'candidates' -> 0 ->> 'match' = 'polygon', 'inside polygon';
  r := explore_check_location(45.5250, -73.5900, 10, now(), now());
  assert r ->> 'resolved_landmark_id' is null, 'outside polygon (radius ignored for polygon landmarks)';

  -- Files must be in your own folder and really uploaded.
  assert pg_temp.fails_with(format($q$ select pg_temp.reg(%L, 45.4930, -73.6170) $q$, bob || '/x.jpg')) = '42501', 'not your folder';
  if to_regclass('storage.objects') is not null then
    assert pg_temp.fails_with(format($q$ select pg_temp.reg(%L, 45.4930, -73.6170) $q$, alice || '/never-uploaded.jpg')) = 'P0002', 'file must exist';
  end if;

  -- Scenario 6: full catalogue + personal flags. Recommendation is an extra flag, never a filter.
  insert into landmark_recommendations (profile_id, landmark_id, reason) values (apid, t_park, 'test');
  vw := landmarks_in_view(-73.7, 45.45, -73.5, 45.55);
  assert jsonb_array_length(vw) = 4, 'all active landmarks in view: ' || jsonb_array_length(vw);
  assert (select (v ->> 'recommended')::boolean from jsonb_array_elements(vw) v where (v ->> 'id')::uuid = t_park), 'park recommended';
  assert (select (v ->> 'visited')::boolean and not (v ->> 'recommended')::boolean from jsonb_array_elements(vw) v where (v ->> 'id')::uuid = t_orat), 'oratory visited, not recommended, still shown';
  assert jsonb_array_length(landmarks_in_view(-73.60, 45.51, -73.58, 45.53)) = 1, 'viewport filters';
  assert (landmark_get('test-park') -> 'polygon' ->> 'type') = 'MultiPolygon', 'detail has polygon';
  assert landmark_get('test-laval') is null, 'inactive landmark hidden';

  -- Gallery lists the landmark association.
  assert (select count(*) from jsonb_array_elements(gallery_list(apid)) p where p ->> 'landmark_name' = 'Test Oratory') = 2, 'gallery shows landmark';
  assert (select count(*) from jsonb_array_elements(gallery_list(apid)) p where p ->> 'association_status' = 'montreal_unassigned') = 1, 'gallery shows memory';

  -- Bob sees none of it.
  perform pg_temp.act_as(bob);
  assert pg_temp.fails_with(format('select gallery_list(%L)', apid)) = '42501', 'bob cannot list alice''s photos';
  assert explore_my_discoveries() = '[]'::jsonb, 'bob has no discoveries';
  assert not (select bool_or((v ->> 'visited')::boolean or (v ->> 'recommended')::boolean)
                from jsonb_array_elements(landmarks_in_view(-73.7, 45.45, -73.5, 45.55)) v), 'flags are per person';
  perform pg_temp.act_as(alice);

  -- Deleting the first photo keeps the visit.
  perform gallery_delete_photo(apid, p1);
  assert (select first_photo_id is null from user_landmark_discoveries where profile_id = apid and landmark_id = t_orat), 'visit kept, photo link cleared';

  -- Rate limit.
  update explore_settings set max_captures_per_10min = 3;
  r := explore_check_location(45.4930, -73.6170, 10, now(), now());
  assert r ->> 'status' = 'rate_limited', 'rate limited at 3 recent captures';

  raise notice 'All exploration checks passed';
end;
$$;

rollback;
