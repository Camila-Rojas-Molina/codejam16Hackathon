-- Checks 007_landmarks_geofencing.sql: geofences, the Montréal boundary, visits, gallery rows and the
-- owner rules, following the six test scenarios. Rolls back, so it's safe on the real project.
-- Run in the Supabase SQL editor after the migrations (with or without 008/009 loaded).
-- Prints "All exploration checks passed".
--
-- Inside the transaction it hides the real catalogue (is_active = false) and adds its own landmarks
-- around Saint Joseph's Oratory, so results don't depend on the imported data. Without 008 it uses a
-- rough box around the island instead of the real boundary. Users are simulated like gallery_test.sql.
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

-- A reading taken just now, as the app sends it.
create or replace function pg_temp.check_at(lat double precision, lng double precision, acc double precision default 15)
returns jsonb language sql as $$
  select explore_check_location(lat, lng, acc, now(), now())
$$;

-- Pretends the app uploaded a file (the register function checks storage.objects), then registers it.
create or replace function pg_temp.capture(p_user uuid, lat double precision, lng double precision,
                                           pick uuid default null, acc double precision default 15)
returns jsonb language plpgsql as $$
declare
  path text := p_user::text || '/' || replace(gen_random_uuid()::text, '-', '') || '.jpg';
begin
  if to_regclass('storage.objects') is not null then
    execute 'insert into storage.objects (bucket_id, name, metadata) values ($1, $2, $3)'
      using 'gallery', path, jsonb_build_object('size', 123456, 'mimetype', 'image/jpeg');
  end if;
  return explore_register_capture(path, lat, lng, acc, now(), now(), pick, 1200, 1600, 123456);
end;
$$;

do $$
declare
  alice    uuid := 'a11ce000-0000-4000-8000-0000000000e1';
  bob      uuid := 'b0b00000-0000-4000-8000-0000000000e2';
  carol    uuid := 'ca401000-0000-4000-8000-0000000000e3';
  apid     uuid;
  bpid     uuid;
  cpid     uuid;
  oratory  uuid := 'e0000000-0000-4000-8000-000000000001';
  twin_a   uuid := 'e0000000-0000-4000-8000-000000000002';
  twin_b   uuid := 'e0000000-0000-4000-8000-000000000003';
  park     uuid := 'e0000000-0000-4000-8000-000000000004';
  statue   uuid := 'e0000000-0000-4000-8000-000000000005';
  far_away uuid := 'e0000000-0000-4000-8000-000000000006';
  hidden   uuid := 'e0000000-0000-4000-8000-000000000007';
  real_boundary boolean;
  r        jsonb;
  list     jsonb;
  first_photo uuid;
begin
  -- Catalogue: hide the real one, add test places.
  update landmarks set is_active = false where is_active;
  insert into landmarks (id, slug, name, category, prominence, latitude, longitude, geofence_radius_m,
                         source_name, source_license, source_record_id)
  values (oratory,  'test-oratory',  'Test Oratory',    'religious', 1, 45.49188, -73.61650, 200, 'test', 'test', 'oratory'),
         -- Two circles 3 m apart, ~330 m north of the Oratory: too close to call.
         (twin_a,   'test-twin-a',   'Test Twin A',     'public-art', 4, 45.49488, -73.61650, 40, 'test', 'test', 'twin-a'),
         (twin_b,   'test-twin-b',   'Test Twin B',     'public-art', 4, 45.49491, -73.61650, 40, 'test', 'test', 'twin-b'),
         (statue,   'test-statue',   'Test Statue',     'public-art', 4, 45.50500, -73.58000, 30, 'test', 'test', 'statue'),
         -- ~16 km away, in Rivière-des-Prairies.
         (far_away, 'test-far-away', 'Test Far Away',   'landmark', 2, 45.63000, -73.54000, 60, 'test', 'test', 'far-away');
  insert into landmarks (id, slug, name, category, prominence, latitude, longitude, geofence_radius_m, geofence_polygon,
                         source_name, source_license, source_record_id)
  values (park, 'test-park', 'Test Park', 'park', 2, 45.50500, -73.58000, 120,
          extensions.st_multi(extensions.st_geomfromtext(
            'POLYGON((-73.583 45.503, -73.577 45.503, -73.577 45.507, -73.583 45.507, -73.583 45.503))', 4326))::extensions.geography,
          'test', 'test', 'park');
  insert into landmarks (id, slug, name, category, latitude, longitude, source_name, source_license, source_record_id, is_active)
  values (hidden, 'test-hidden', 'Test Retired', 'landmark', 45.4919, -73.6166, 'test', 'test', 'hidden', false);

  -- Boundary: the real one when 008 is loaded, else a rough box around the island.
  real_boundary := exists (select 1 from service_areas where id = 'montreal-island');
  if not real_boundary then
    insert into service_areas (id, name, geom, source_name, source_license)
    values ('montreal-island', 'Test box', extensions.st_multi(extensions.st_geomfromtext(
              'POLYGON((-73.98 45.40, -73.47 45.40, -73.47 45.70, -73.98 45.70, -73.98 45.40))', 4326)), 'test', 'test');
    perform refresh_service_area_parts('montreal-island');
  end if;

  insert into auth.users (id, email) values (alice, 'alice-explore@example.test'), (bob, 'bob-explore@example.test'),
                                            (carol, 'carol-explore@example.test');
  perform pg_temp.act_as(alice);
  apid := (migo_create_account('Alice', 'sun') ->> 'id')::uuid;
  perform pg_temp.act_as(bob);
  bpid := (migo_create_account('Bob', 'star') ->> 'id')::uuid;
  perform pg_temp.act_as(carol);
  cpid := (migo_create_account('Carol', 'flower') ->> 'id')::uuid;

  -- Security: the browser reads only the active catalogue; everything else goes through functions.
  assert has_table_privilege('anon', 'landmarks', 'select'), 'anon can read the catalogue';
  assert not has_table_privilege('authenticated', 'landmarks', 'insert'), 'nobody can add landmarks from the browser';
  assert not has_table_privilege('authenticated', 'landmarks', 'update'), 'nobody can edit landmarks from the browser';
  assert not has_table_privilege('authenticated', 'landmark_discoveries', 'select'), 'visits are private';
  assert not has_table_privilege('authenticated', 'landmark_discoveries', 'insert'), 'visits only through register';
  assert not has_table_privilege('authenticated', 'photos', 'insert'), 'photos only through functions';
  assert not has_table_privilege('authenticated', 'explore_settings', 'select'), 'settings are private';
  assert has_function_privilege('anon', 'landmarks_in_view(double precision,double precision,double precision,double precision,integer)', 'execute'), 'map works signed out';
  assert not has_function_privilege('anon', 'explore_check_location(double precision,double precision,double precision,timestamptz,timestamptz)', 'execute'), 'anon cannot check';
  assert not has_function_privilege('anon', 'explore_register_capture(text,double precision,double precision,double precision,timestamptz,timestamptz,uuid,integer,integer,integer)', 'execute'), 'anon cannot register';
  assert not has_function_privilege('authenticated', 'explore_evaluate_fix(uuid,double precision,double precision,double precision,timestamptz,timestamptz,boolean)', 'execute'), 'internal check is internal';
  perform pg_temp.act_as(null);
  assert pg_temp.fails_with('select pg_temp.check_at(45.49188, -73.61650)') = '42501', 'signed out: no check';

  -- Scenario 6: the whole catalogue, recommended or not; retired places hidden.
  list := landmarks_in_view(-74.0, 45.38, -73.4, 45.72);
  assert jsonb_array_length(list) = 6, format('catalogue shows every active place, got %s', jsonb_array_length(list));
  assert not exists (select 1 from jsonb_array_elements(list) e where e ->> 'id' = hidden::text), 'retired place hidden';
  assert not exists (select 1 from jsonb_array_elements(list) e where (e ->> 'visited')::boolean), 'signed out: nothing visited';
  assert jsonb_array_length(landmarks_in_view(-73.62, 45.49, -73.61, 45.493)) = 1, 'viewport filters by bounds';
  assert pg_temp.fails_with('select landmarks_in_view(-73.6, 45.6, -73.7, 45.5)') = '22023', 'bad bounds refused';
  assert landmark_get('test-park') -> 'polygon' ->> 'type' = 'MultiPolygon', 'park detail has its area';
  assert landmark_get(oratory::text) ->> 'slug' = 'test-oratory', 'detail by id';
  assert landmark_get('test-hidden') is null, 'retired place has no detail';

  -- Scenario 1: first visit to the Oratory.
  perform pg_temp.act_as(alice);
  r := pg_temp.check_at(45.49200, -73.61600);
  assert r ->> 'status' = 'ok' and r ->> 'resolved_landmark_id' = oratory::text, format('at the Oratory: %s', r);
  r := pg_temp.capture(alice, 45.49200, -73.61600);
  assert r ->> 'association_status' = 'landmark_visit' and (r ->> 'new_discovery')::boolean, format('first visit: %s', r);
  assert r -> 'landmark' ->> 'name' = 'Test Oratory', 'photo linked to the Oratory';
  first_photo := (r ->> 'photo_id')::uuid;
  assert (select count(*) from landmark_discoveries where profile_id = apid) = 1, 'one visit recorded';
  list := landmarks_in_view(-73.62, 45.49, -73.61, 45.493);
  assert (list -> 0 ->> 'visited')::boolean, 'map shows the Oratory as visited';
  assert (gallery_list(apid) -> 0 ->> 'landmark_name') = 'Test Oratory', 'gallery shows the place';
  assert (gallery_list(apid) -> 0 ->> 'lat') is null, 'no raw coordinates stored';
  perform pg_temp.act_as(bob);
  assert not (landmarks_in_view(-73.62, 45.49, -73.61, 45.493) -> 0 ->> 'visited')::boolean, 'visits are per person';

  -- Scenario 2: inside Montréal, no place nearby → Montréal memory, nothing visited.
  perform pg_temp.act_as(alice);
  r := pg_temp.check_at(45.54500, -73.65000);
  assert r ->> 'status' = 'ok' and r ->> 'resolved_landmark_id' is null and jsonb_array_length(r -> 'candidates') = 0, format('no place: %s', r);
  r := pg_temp.capture(alice, 45.54500, -73.65000);
  assert r ->> 'association_status' = 'montreal_unassigned' and r -> 'landmark' = 'null'::jsonb, format('memory: %s', r);
  assert (select count(*) from landmark_discoveries where profile_id = apid) = 1, 'memory marks nothing visited';

  -- Scenario 3: repeat visit → another photo, still one visit.
  r := pg_temp.capture(alice, 45.49190, -73.61640);
  assert r ->> 'association_status' = 'landmark_visit' and not (r ->> 'new_discovery')::boolean, format('repeat: %s', r);
  assert (select count(*) from landmark_discoveries where profile_id = apid) = 1, 'visit stays unique';
  assert (explore_my_discoveries() -> 0 ->> 'photo_count')::int = 2, 'both photos count for the place';

  -- Scenario 4: untrustworthy readings → retry, never associated.
  r := pg_temp.check_at(45.49200, -73.61600, 300);
  assert r ->> 'status' = 'retry' and r ->> 'reason' = 'poor_accuracy', format('poor accuracy: %s', r);
  assert pg_temp.fails_with(format('select pg_temp.capture(%L, 45.492, -73.616, null, 300)', alice)) = 'MG001', 'register refuses poor accuracy';
  r := explore_check_location(45.492, -73.616, 15, now() - interval '10 minutes', now() - interval '10 minutes');
  assert r ->> 'reason' = 'stale_position', format('stale: %s', r);
  r := explore_check_location(45.492, -73.616, 15, now(), now() - interval '5 minutes');
  assert r ->> 'reason' = 'capture_gap', format('gap: %s', r);
  r := explore_check_location(45.492, -73.616, 15, now() + interval '1 hour', now() + interval '1 hour');
  assert r ->> 'reason' = 'future_timestamp', format('future: %s', r);
  assert pg_temp.fails_with('select explore_check_location(95, -73.6, 15, now(), now())') = '22023', 'bad latitude refused';

  -- Scenario 5: outside the island → refused, nothing saved.
  r := pg_temp.check_at(43.65320, -79.38320);
  assert r ->> 'status' = 'outside_area', format('Toronto: %s', r);
  if real_boundary then
    r := pg_temp.check_at(45.53120, -73.51810);
    assert r ->> 'status' = 'outside_area', format('Longueuil: %s', r);
    r := pg_temp.check_at(45.60660, -73.71240);
    assert r ->> 'status' = 'outside_area', format('Laval: %s', r);
  end if;
  assert pg_temp.fails_with(format('select pg_temp.capture(%L, 43.6532, -79.3832)', alice)) = 'MG002', 'register refuses outside';
  assert (select count(*) from photos where profile_id = apid) = 3, 'refused captures saved nothing';

  -- Overlapping circles: too close to call → the person picks one of the candidates.
  perform pg_temp.act_as(bob);
  r := pg_temp.check_at(45.49490, -73.61650);
  assert r ->> 'status' = 'ok' and (r ->> 'ambiguous')::boolean and r ->> 'resolved_landmark_id' is null, format('twins: %s', r);
  assert jsonb_array_length(r -> 'candidates') = 2, 'both twins offered';
  assert pg_temp.fails_with(format('select pg_temp.capture(%L, 45.4949, -73.6165)', bob)) = 'MG004', 'must pick';
  assert pg_temp.fails_with(format('select pg_temp.capture(%L, 45.4949, -73.6165, %L)', bob, oratory)) = 'MG004', 'cannot pick a place that is not nearby';
  r := pg_temp.capture(bob, 45.49490, -73.61650, twin_b);
  assert r -> 'landmark' ->> 'id' = twin_b::text, format('picked twin: %s', r);
  assert pg_temp.fails_with(format('select explore_register_capture(%L, 45.4949, -73.6165, 15, now(), now())', alice::text || '/x.jpg')) = '42501',
    'cannot save into someone else''s folder';

  -- Areas: a circle inside an area wins; elsewhere in the area, the area.
  perform pg_temp.act_as(carol);
  r := pg_temp.check_at(45.50500, -73.58000);
  assert r ->> 'resolved_landmark_id' = statue::text and jsonb_array_length(r -> 'candidates') = 2, format('statue in park: %s', r);
  r := pg_temp.check_at(45.50650, -73.58000);
  assert r ->> 'resolved_landmark_id' = park::text and r -> 'candidates' -> 0 ->> 'match' = 'polygon', format('in the park: %s', r);
  r := pg_temp.check_at(45.50800, -73.58000);
  assert r ->> 'resolved_landmark_id' is null, format('outside the park: %s', r);

  -- Basic spoofing check: a visit 20 km from the previous one, seconds later.
  r := pg_temp.capture(carol, 45.49200, -73.61600);
  assert r ->> 'association_status' = 'landmark_visit', 'carol at the Oratory';
  r := pg_temp.check_at(45.63000, -73.54000);
  assert r ->> 'status' = 'retry' and r ->> 'reason' = 'implausible_travel', format('teleport: %s', r);

  -- Rate limit.
  update explore_settings set rate_limit_count = 3;
  perform pg_temp.act_as(alice);
  r := pg_temp.check_at(45.49200, -73.61600);
  assert r ->> 'status' = 'rate_limited', format('rate limit: %s', r);
  update explore_settings set rate_limit_count = 30;

  -- Deleting a landmark photo keeps the visit; the next photo becomes its cover.
  perform gallery_delete_photo(apid, first_photo);
  assert (select count(*) from landmark_discoveries where profile_id = apid) = 1, 'visit survives the photo';
  assert (select first_gallery_photo_id from landmark_discoveries where profile_id = apid) is null, 'cover cleared';

  -- Deleting the account removes its photos and visits.
  perform migo_delete_account(apid);
  assert not exists (select 1 from landmark_discoveries where profile_id = apid), 'visits deleted with the account';
  assert not exists (select 1 from photos where profile_id = apid), 'photos deleted with the account';

  raise notice 'All exploration checks passed';
end;
$$;

select 'All exploration checks passed' as result;
rollback;
