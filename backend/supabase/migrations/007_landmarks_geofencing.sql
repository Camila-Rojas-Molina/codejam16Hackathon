-- Landmarks, GPS geofences and visits: the Montréal exploration loop. Run after 006. Safe to run again.
--
--   * PostGIS (Supabase keeps it in the `extensions` schema) does every geographical check. The app
--     sends one GPS reading per photo; the server decides what it means. Never the other way round.
--   * `landmarks` is the public catalogue: every active place, recommended or not. A landmark has a
--     circular geofence (its point + geofence_radius_m, checked with ST_DWithin on geography, metres)
--     or, for big places (parks, campuses…), an area (geofence_polygon, ST_Covers / ST_DWithin with a
--     small edge tolerance). Rows come from backend/scripts/import_landmarks.mjs (009).
--   * `service_areas` holds the Island of Montréal boundary (008). Photos taken outside it are refused.
--   * Camera flow (frontend/src/features/camera):
--       1. explore_check_location()  read only: is the reading usable, is it on the island, which places match
--       2. the app uploads the JPEG to <auth uid>/<random>.jpg in the now PRIVATE 'gallery' bucket
--       3. explore_register_capture() checks the reading again and, in one transaction, saves the
--          `photos` row and (the first time only) the `landmark_discoveries` row.
--     If step 3 fails the app deletes the file; gallery_orphan_files lists any that slip through.
--   * Raw coordinates are never stored for camera photos: a photo keeps its landmark, its association
--     ('landmark_visit' or 'montreal_unassigned') and the reported GPS accuracy.
--   * A visit marks the landmark visited. It doesn't award points (separate task).
--   * Recommendations: landmark_recommended_ids(profile) is the hook for the Questionnaire B
--     recommender. It returns nothing until that exists; recommended places only get a badge.
--   * Thresholds live in `explore_settings` (one row) so they can be tuned from the dashboard after
--     testing on real phones. GPS can be spoofed; these checks are basic abuse prevention, not proof.
--   * Managing landmarks: the Supabase dashboard (Table editor) or re-running the import. The browser
--     can only read the active catalogue.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

create table if not exists explore_settings (
  id                        boolean primary key default true check (id),
  -- Readings less accurate than this (metres) are refused: the app asks for a new one.
  max_accuracy_m            double precision not null default 50 check (max_accuracy_m between 5 and 1000),
  -- At the check, the reading must be at most this old (seconds, server clock).
  max_position_age_s        integer not null default 120 check (max_position_age_s between 10 and 3600),
  -- At registration (after the upload and maybe a choice), at most this old.
  max_register_delay_s      integer not null default 900 check (max_register_delay_s between 60 and 7200),
  -- Photo and reading must be at most this far apart (seconds, both from the phone's clock).
  max_capture_gap_s         integer not null default 120 check (max_capture_gap_s between 5 and 1800),
  -- Phone clocks run a little fast sometimes.
  max_future_skew_s         integer not null default 120 check (max_future_skew_s between 0 and 3600),
  -- Two circular matches closer than this (or than half the accuracy) are too close to call.
  ambiguity_margin_m        double precision not null default 10 check (ambiguity_margin_m between 0 and 500),
  -- How far outside an area's edge still counts as inside it.
  polygon_edge_tolerance_m  double precision not null default 10 check (polygon_edge_tolerance_m between 0 and 200),
  -- How far off the island's shoreline still counts as on the island (piers, bridges' ends…).
  island_edge_tolerance_m   double precision not null default 30 check (island_edge_tolerance_m between 0 and 500),
  -- At most this many camera photos per window.
  rate_limit_count          integer not null default 30 check (rate_limit_count between 1 and 1000),
  rate_limit_window_s       integer not null default 600 check (rate_limit_window_s between 10 and 86400),
  -- Faster than this between two visits (metres per second, ~250 km/h) looks like a fake location.
  max_travel_speed_mps      double precision not null default 70 check (max_travel_speed_mps between 5 and 400),
  updated_at                timestamptz not null default now()
);
insert into explore_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Service area: the Island of Montréal (boundary loaded by 008)
-- ---------------------------------------------------------------------------

create table if not exists service_areas (
  id              text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  name            text not null,
  geom            extensions.geometry(MultiPolygon, 4326) not null,
  source_name     text not null,
  source_url      text,
  source_license  text not null,
  updated_at      timestamptz not null default now()
);

-- The boundary cut into small pieces, so "is this point on the island?" is a fast index lookup.
create table if not exists service_area_parts (
  area_id  text not null references service_areas(id) on delete cascade,
  part_no  integer not null,
  geom     extensions.geometry(Polygon, 4326) not null,
  primary key (area_id, part_no)
);
create index if not exists service_area_parts_geom_idx on service_area_parts using gist (geom);

-- Rebuilds service_area_parts for one area. 008 calls it after loading the boundary.
create or replace function refresh_service_area_parts(p_area_id text) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare
  n integer;
begin
  delete from service_area_parts where area_id = p_area_id;
  insert into service_area_parts (area_id, part_no, geom)
  select p_area_id, row_number() over (), d.geom
    from service_areas a
    cross join lateral st_subdivide(a.geom, 128) as sub(g)
    cross join lateral st_dump(sub.g) as d
   where a.id = p_area_id and geometrytype(d.geom) = 'POLYGON';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Landmark catalogue
-- ---------------------------------------------------------------------------

create table if not exists landmarks (
  -- Stable: the import derives it from (source_name, source_record_id) with UUID v5.
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name               text not null check (char_length(btrim(name)) between 1 and 200),
  description        text check (char_length(description) <= 2000),
  category           text not null check (category in ('landmark', 'museum', 'park', 'historic', 'architecture',
                       'religious', 'culture', 'viewpoint', 'market', 'public-art', 'campus', 'other')),
  -- 1 = major landmark … 4 = minor place (from the source's classification). Orders the map.
  prominence         smallint not null default 3 check (prominence between 1 and 4),
  -- WGS84 (EPSG:4326).
  latitude           double precision not null check (latitude between -90 and 90),
  longitude          double precision not null check (longitude between -180 and 180),
  location           extensions.geography(Point, 4326) generated always as
                       (extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography) stored,
  -- Circular geofence, used when there's no polygon.
  geofence_radius_m  integer not null default 60 check (geofence_radius_m between 10 and 2000),
  -- Area geofence for big places, from open data only (never drawn by hand from map imagery).
  geofence_polygon   extensions.geography(MultiPolygon, 4326),
  -- Optional, for later clustering/aggregation. Never used to decide a visit.
  h3_index           text,
  address            text,
  neighbourhood      text,
  source_name        text not null,
  source_url         text,
  source_license     text not null,
  source_record_id   text not null,
  -- Records from other sources merged into this one: [{source_name, source_record_id, source_license, source_url}].
  merged_sources     jsonb not null default '[]'::jsonb check (jsonb_typeof(merged_sources) = 'array'),
  -- Uncertain licence or data: check before relying on it.
  needs_review       boolean not null default false,
  review_note        text,
  -- Retired places are deactivated, never deleted (visits point at them).
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (source_name, source_record_id)
);
create index if not exists landmarks_location_idx on landmarks using gist (location);
create index if not exists landmarks_polygon_idx on landmarks using gist (geofence_polygon);
create index if not exists landmarks_lat_lng_idx on landmarks (latitude, longitude) where is_active;

create or replace function landmarks_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists landmarks_touch on landmarks;
create trigger landmarks_touch before update on landmarks for each row execute function landmarks_touch();

-- ---------------------------------------------------------------------------
-- Visits and camera photos
-- ---------------------------------------------------------------------------

-- One row per person per landmark: the first visit. More photos of the same place only add photos.
create table if not exists landmark_discoveries (
  id                      uuid primary key default gen_random_uuid(),
  profile_id              uuid not null references profiles(id) on delete cascade,
  landmark_id             uuid not null references landmarks(id) on delete restrict,
  first_visited_at        timestamptz not null,
  first_gallery_photo_id  uuid references photos(id) on delete set null,
  created_at              timestamptz not null default now(),
  unique (profile_id, landmark_id)
);
create index if not exists landmark_discoveries_profile_idx on landmark_discoveries (profile_id, first_visited_at desc);

-- Camera photos are ordinary gallery photos with a verified association. Manual uploads (006) keep
-- association_status null and can never be linked to a landmark.
alter table photos add column if not exists landmark_id uuid references landmarks(id) on delete restrict;
alter table photos add column if not exists association_status text
  check (association_status in ('landmark_visit', 'montreal_unassigned'));
alter table photos add column if not exists gps_accuracy_m real check (gps_accuracy_m >= 0);
alter table photos add column if not exists file_size_bytes integer check (file_size_bytes between 1 and 20971520);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photos_landmark_matches_status') then
    alter table photos add constraint photos_landmark_matches_status check (
      case association_status when 'landmark_visit' then landmark_id is not null else landmark_id is null end);
  end if;
end;
$$;
create index if not exists photos_profile_landmark_idx on photos (profile_id, landmark_id) where landmark_id is not null;
create index if not exists photos_profile_captures_idx on photos (profile_id, created_at desc) where association_status is not null;

-- ---------------------------------------------------------------------------
-- Security: the browser reads the active catalogue; everything else goes through the functions below
-- ---------------------------------------------------------------------------

alter table landmarks enable row level security;
alter table landmark_discoveries enable row level security;
alter table service_areas enable row level security;
alter table service_area_parts enable row level security;
alter table explore_settings enable row level security;

revoke all on landmarks, landmark_discoveries, service_areas, service_area_parts, explore_settings from anon, authenticated;
grant select on landmarks to anon, authenticated;
drop policy if exists "landmarks: the active catalogue is public" on landmarks;
create policy "landmarks: the active catalogue is public" on landmarks for select to anon, authenticated using (is_active);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The signed-in login's profile id, or null.
create or replace function explore_my_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from profiles where auth_user_id = auth.uid()
$$;

-- Recommendation hook (Questionnaire B). Returns the landmark ids recommended to this profile (may be
-- called with null). The map shows them with a badge; nothing is ever hidden. The recommender replaces
-- this function (same signature); this file only creates it when it doesn't exist, so re-running it
-- never overwrites the real one. Until then: no recommendations, rather than invented ones.
do $$
begin
  if to_regprocedure('public.landmark_recommended_ids(uuid)') is null then
    execute $f$
      create function public.landmark_recommended_ids(p_profile_id uuid) returns setof uuid
      language sql stable security definer set search_path = public as $b$
        select null::uuid where false
      $b$
    $f$;
  end if;
end;
$$;

-- Checks one GPS reading. Used by explore_check_location (p_for_register false) and again by
-- explore_register_capture (true: the reading may be older, the upload took time). Returns
-- {status, reason, message, candidates, resolved_landmark_id, ambiguous, limits}; see
-- frontend/src/features/explore/types.ts (LocationCheck).
--
-- Matching: circular geofences (ST_DWithin from the point) and areas (inside, or within the edge
-- tolerance). When several match, the deterministic default is:
--   * a circle beats an area (a statue inside a park is the more specific place);
--   * among circles, the nearest, unless the second is within max(ambiguity margin, accuracy / 2):
--     then it's too close to call (ambiguous, the person picks);
--   * among areas only, the smallest when it's at most half the size of the next (nested areas),
--     otherwise ambiguous.
-- The person may always pick another candidate instead of the default (geofences overlap).
create or replace function explore_evaluate_fix(
  p_profile_id   uuid,
  p_lat          double precision,
  p_lng          double precision,
  p_accuracy_m   double precision,
  p_position_at  timestamptz,
  p_captured_at  timestamptz,
  p_for_register boolean
) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  s          explore_settings;
  pt         geography;
  ptg        geometry;
  limits     jsonb;
  max_age    integer;
  cands      jsonb;
  n_circle   integer;
  n_area     integer;
  margin     double precision;
  resolved   uuid;
  ambiguous  boolean := false;
  a1         record;
  a2         record;
  prev       record;
  gap_s      double precision;
  moved_m    double precision;

  -- jsonb result helper
  result jsonb;
begin
  select * into s from explore_settings where id;
  if not found then
    raise exception 'explore_settings is empty: re-run 007_landmarks_geofencing.sql' using errcode = '55000';
  end if;
  limits := jsonb_build_object('max_accuracy_m', s.max_accuracy_m, 'max_position_age_s', s.max_position_age_s,
                               'max_capture_gap_s', s.max_capture_gap_s);
  result := jsonb_build_object('candidates', '[]'::jsonb, 'resolved_landmark_id', null, 'ambiguous', false, 'limits', limits);

  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or p_accuracy_m is null or p_accuracy_m <= 0 or p_accuracy_m > 100000
     or p_position_at is null or p_captured_at is null then
    raise exception 'Invalid location reading' using errcode = '22023';
  end if;

  -- 1. Is the reading usable?
  if p_position_at > now() + make_interval(secs => s.max_future_skew_s)
     or p_captured_at > now() + make_interval(secs => s.max_future_skew_s) then
    return result || jsonb_build_object('status', 'retry', 'reason', 'future_timestamp',
      'message', 'Your phone’s clock looks wrong, so this location can’t be checked. Fix the date and time, then try again.');
  end if;
  max_age := case when p_for_register then s.max_register_delay_s else s.max_position_age_s end;
  if p_position_at < now() - make_interval(secs => max_age) then
    return result || jsonb_build_object('status', 'retry', 'reason', 'stale_position',
      'message', 'That location reading is too old. Get a fresh one.');
  end if;
  if abs(extract(epoch from p_position_at - p_captured_at)) > s.max_capture_gap_s then
    return result || jsonb_build_object('status', 'retry', 'reason', 'capture_gap',
      'message', format('Your location was read more than %s seconds away from the photo. Retake the photo.', s.max_capture_gap_s));
  end if;
  if p_accuracy_m > s.max_accuracy_m then
    return result || jsonb_build_object('status', 'retry', 'reason', 'poor_accuracy',
      'message', format('Your location is only accurate to about %s m (we need %s m or better). Step into the open and try again.',
                        round(p_accuracy_m::numeric), round(s.max_accuracy_m::numeric)));
  end if;

  pt := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  ptg := st_setsrid(st_makepoint(p_lng, p_lat), 4326);

  -- 2. On the Island of Montréal?
  if not exists (select 1 from service_area_parts where area_id = 'montreal-island') then
    raise exception 'The Montréal boundary isn’t loaded yet: run 008_montreal_island_boundary.sql' using errcode = '55000';
  end if;
  if not exists (
    select 1 from service_area_parts a
     where a.area_id = 'montreal-island'
       and (st_covers(a.geom, ptg)
            or (a.geom && st_expand(ptg, 0.01) and st_dwithin(a.geom::geography, pt, s.island_edge_tolerance_m)))) then
    return result || jsonb_build_object('status', 'outside_area', 'reason', 'outside_montreal',
      'message', 'You’re outside the Island of Montréal. For now, MIGO only saves photos taken on the island.');
  end if;

  -- 3. Not too many captures in a short time.
  if p_profile_id is not null and (
       select count(*) from photos
        where profile_id = p_profile_id and association_status is not null
          and created_at > now() - make_interval(secs => s.rate_limit_window_s)) >= s.rate_limit_count then
    return result || jsonb_build_object('status', 'rate_limited', 'reason', 'rate_limited',
      'message', 'That’s a lot of photos in a short time. Take a breather and try again in a few minutes.');
  end if;

  -- 4. Which geofences contain the reading? Circles first (nearest first), then areas.
  select coalesce(jsonb_agg(to_jsonb(c) order by c.kind_rank, c.distance_m, c.name), '[]'::jsonb)
    into cands
    from (
      select l.id, l.name, l.category,
             round(st_distance(l.location, pt)::numeric, 1)::double precision as distance_m,
             case when l.geofence_polygon is null then 'radius' else 'polygon' end as match,
             case when l.geofence_polygon is null then 0 else 1 end as kind_rank,
             case when l.geofence_polygon is null then null else st_area(l.geofence_polygon) end as area_m2,
             exists (select 1 from landmark_discoveries d
                      where d.profile_id = p_profile_id and d.landmark_id = l.id) as visited
        from landmarks l
       where l.is_active
         and ((l.geofence_polygon is null
               and st_dwithin(l.location, pt, 2000)                      -- index-friendly prefilter (max radius)
               and st_dwithin(l.location, pt, l.geofence_radius_m))
           or (l.geofence_polygon is not null
               and (st_covers(l.geofence_polygon, pt) or st_dwithin(l.geofence_polygon, pt, s.polygon_edge_tolerance_m))))
       order by kind_rank, distance_m
       limit 12
    ) c;

  select count(*) filter (where e ->> 'match' = 'radius'), count(*) filter (where e ->> 'match' = 'polygon')
    into n_circle, n_area
    from jsonb_array_elements(cands) e;

  margin := greatest(s.ambiguity_margin_m, p_accuracy_m / 2);
  if n_circle = 1 or (n_circle > 1
      and (cands -> 1 ->> 'distance_m')::double precision - (cands -> 0 ->> 'distance_m')::double precision >= margin) then
    resolved := (cands -> 0 ->> 'id')::uuid;
  elsif n_circle > 1 then
    ambiguous := true;
  elsif n_area = 1 then
    resolved := (cands -> 0 ->> 'id')::uuid;
  elsif n_area > 1 then
    select (e ->> 'id')::uuid as id, (e ->> 'area_m2')::double precision as area into a1
      from jsonb_array_elements(cands) e order by (e ->> 'area_m2')::double precision limit 1;
    select (e ->> 'area_m2')::double precision as area into a2
      from jsonb_array_elements(cands) e order by (e ->> 'area_m2')::double precision offset 1 limit 1;
    if a1.area <= a2.area / 2 then
      resolved := a1.id;
    else
      ambiguous := true;
    end if;
  end if;

  -- 5. Basic spoofing check: a visit too far from the previous one, too soon after it.
  if p_profile_id is not null and jsonb_array_length(cands) > 0 then
    select ph.taken_at, l.location, l.geofence_polygon, l.geofence_radius_m into prev
      from photos ph join landmarks l on l.id = ph.landmark_id
     where ph.profile_id = p_profile_id and ph.association_status = 'landmark_visit'
     order by ph.taken_at desc
     limit 1;
    if found then
      gap_s := abs(extract(epoch from p_captured_at - prev.taken_at));
      if gap_s < 7200 then
        moved_m := case when prev.geofence_polygon is not null then st_distance(prev.geofence_polygon, pt)
                        else greatest(0, st_distance(prev.location, pt) - prev.geofence_radius_m) end;
        if moved_m > s.max_travel_speed_mps * gap_s + 500 then
          return result || jsonb_build_object('status', 'retry', 'reason', 'implausible_travel',
            'message', 'Your location jumped too far since your last visit. Wait a moment and try again.');
        end if;
      end if;
    end if;
  end if;

  return result || jsonb_build_object(
    'status', 'ok',
    'reason', null,
    'candidates', cands,
    'resolved_landmark_id', resolved,
    'ambiguous', ambiguous,
    'message', case
      when resolved is not null then format('You’re at %s.', (select name from landmarks where id = resolved))
      when ambiguous then 'You’re near several MIGO places. Pick the one you photographed.'
      else 'No MIGO place right here. The photo will be saved as a Montréal memory.'
    end);
end;
$$;

-- ---------------------------------------------------------------------------
-- API functions
-- ---------------------------------------------------------------------------

-- Active landmarks inside the map viewport, with the signed-in person's visited/recommended flags.
-- Recommended and visited places, then the most prominent, come first when there are more than p_limit.
-- Works signed out (flags false). Always a JSON array.
create or replace function landmarks_in_view(
  p_west  double precision,
  p_south double precision,
  p_east  double precision,
  p_north double precision,
  p_limit integer default 3000
) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  me  uuid := explore_my_profile_id();
  lim integer := least(greatest(coalesce(p_limit, 3000), 1), 5000);
  rec uuid[] := '{}';
begin
  if p_west is null or p_south is null or p_east is null or p_north is null
     or p_south > p_north or p_west > p_east then
    raise exception 'Invalid map bounds' using errcode = '22023';
  end if;
  if me is not null then
    select coalesce(array_agg(r), '{}') into rec from landmark_recommended_ids(me) r;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', v.id, 'slug', v.slug, 'name', v.name, 'category', v.category,
             'lat', v.latitude, 'lng', v.longitude, 'prominence', v.prominence,
             'geofence_radius_m', v.geofence_radius_m, 'has_polygon', v.has_polygon,
             'visited', v.visited_at is not null, 'visited_at', v.visited_at, 'recommended', v.recommended)
           order by v.prominence, v.name)
      from (
        select l.id, l.slug, l.name, l.category, l.latitude, l.longitude, l.prominence, l.geofence_radius_m,
               l.geofence_polygon is not null as has_polygon, d.first_visited_at as visited_at,
               l.id = any(rec) as recommended
          from landmarks l
          left join landmark_discoveries d on d.profile_id = me and d.landmark_id = l.id
         where l.is_active
           and l.latitude between p_south and p_north
           and l.longitude between p_west and p_east
         order by (l.id = any(rec)) desc, (d.landmark_id is not null) desc, l.prominence, l.name
         limit lim
      ) v),
    '[]'::jsonb);
end;
$$;

-- One active landmark by id or slug, with its area as GeoJSON and its attribution. Null if unknown.
create or replace function landmark_get(p_id_or_slug text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  me  uuid := explore_my_profile_id();
  key text := btrim(coalesce(p_id_or_slug, ''));
  l   landmarks;
  d   landmark_discoveries;
begin
  if key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into l from landmarks where id = key::uuid and is_active;
  else
    select * into l from landmarks where slug = lower(key) and is_active;
  end if;
  if l.id is null then
    return null;
  end if;
  select * into d from landmark_discoveries where profile_id = me and landmark_id = l.id;
  return jsonb_build_object(
    'id', l.id, 'slug', l.slug, 'name', l.name, 'category', l.category,
    'lat', l.latitude, 'lng', l.longitude, 'prominence', l.prominence,
    'geofence_radius_m', l.geofence_radius_m, 'has_polygon', l.geofence_polygon is not null,
    'visited', d.id is not null, 'visited_at', d.first_visited_at,
    'recommended', me is not null and exists (select 1 from landmark_recommended_ids(me) r where r = l.id),
    'description', l.description, 'address', l.address, 'neighbourhood', l.neighbourhood,
    'polygon', case when l.geofence_polygon is null then null else st_asgeojson(l.geofence_polygon::geometry, 6)::jsonb end,
    'source_name', l.source_name, 'source_url', l.source_url, 'source_license', l.source_license,
    'source_record_id', l.source_record_id);
end;
$$;

-- Read-only check before uploading anything. Signed in only. See explore_evaluate_fix.
create or replace function explore_check_location(
  p_lat         double precision,
  p_lng         double precision,
  p_accuracy_m  double precision,
  p_position_at timestamptz,
  p_captured_at timestamptz
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := explore_my_profile_id();
begin
  if auth.uid() is null or me is null then
    raise exception 'Sign in to save photos' using errcode = '42501';
  end if;
  return explore_evaluate_fix(me, p_lat, p_lng, p_accuracy_m, p_position_at, p_captured_at, false);
end;
$$;

-- Saves an uploaded camera photo after checking the reading again (the server is the source of truth).
-- p_landmark_id: the person's pick when geofences overlap; must be one of the matching candidates.
-- One transaction: the photo row, and the first visit when a landmark matches.
-- Errors (the app deletes the uploaded file on any of them):
--   MG001 retry (hint = reason) · MG002 outside the island · MG003 rate limited · MG004 invalid or missing pick
--   MG005 file not uploaded · 42501 not signed in / not your folder · 22023 bad input · 23505 already saved
create or replace function explore_register_capture(
  p_storage_path    text,
  p_lat             double precision,
  p_lng             double precision,
  p_accuracy_m      double precision,
  p_position_at     timestamptz,
  p_captured_at     timestamptz,
  p_landmark_id     uuid default null,
  p_width           integer default null,
  p_height          integer default null,
  p_file_size_bytes integer default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid       uuid := auth.uid();
  me        uuid := explore_my_profile_id();
  ev        jsonb;
  chosen    uuid;
  size      bigint := p_file_size_bytes;
  obj_meta  jsonb;
  ph        photos;
  is_new    boolean := false;
  first_at  timestamptz;
  lm        landmarks;
begin
  if uid is null or me is null then
    raise exception 'Sign in to save photos' using errcode = '42501';
  end if;
  if p_storage_path is null or position(uid::text || '/' in p_storage_path) <> 1 then
    raise exception 'Photos must be stored in your own folder' using errcode = '42501';
  end if;
  if p_storage_path !~ ('^' || uid::text || '/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|webp)$') then
    raise exception 'Invalid photo path' using errcode = '22023';
  end if;
  if p_width is not null and p_width not between 1 and 20000 or p_height is not null and p_height not between 1 and 20000 then
    raise exception 'Invalid photo size' using errcode = '22023';
  end if;

  -- The file must really be there (uploaded by this login, through the Storage policies).
  if to_regclass('storage.objects') is not null then
    execute 'select metadata from storage.objects where bucket_id = $1 and name = $2'
      into obj_meta using 'gallery', p_storage_path;
    if obj_meta is null then
      raise exception 'The photo hasn’t been uploaded' using errcode = 'MG005';
    end if;
    size := coalesce((obj_meta ->> 'size')::bigint, size);
  end if;
  if size is not null and size not between 1 and 20971520 then
    raise exception 'Invalid photo file size' using errcode = '22023';
  end if;

  ev := explore_evaluate_fix(me, p_lat, p_lng, p_accuracy_m, p_position_at, p_captured_at, true);
  case ev ->> 'status'
    when 'retry' then
      raise exception '%', ev ->> 'message' using errcode = 'MG001', hint = coalesce(ev ->> 'reason', 'retry');
    when 'outside_area' then
      raise exception '%', ev ->> 'message' using errcode = 'MG002', hint = 'outside_area';
    when 'rate_limited' then
      raise exception '%', ev ->> 'message' using errcode = 'MG003', hint = 'rate_limited';
    else
      null;
  end case;

  if p_landmark_id is not null then
    if not exists (select 1 from jsonb_array_elements(ev -> 'candidates') e where (e ->> 'id')::uuid = p_landmark_id) then
      raise exception 'That place isn’t near where the photo was taken' using errcode = 'MG004', hint = 'invalid_choice';
    end if;
    chosen := p_landmark_id;
  elsif (ev ->> 'ambiguous')::boolean then
    raise exception 'Pick the place you photographed' using errcode = 'MG004', hint = 'choice_required';
  else
    chosen := (ev ->> 'resolved_landmark_id')::uuid;
  end if;

  begin
    insert into photos (profile_id, storage_path, city_name, country, country_code, taken_at, width, height,
                        landmark_id, association_status, gps_accuracy_m, file_size_bytes)
    values (me, p_storage_path, 'Montréal', 'Canada', 'CA', least(p_captured_at, now()), p_width, p_height,
            chosen, case when chosen is null then 'montreal_unassigned' else 'landmark_visit' end,
            p_accuracy_m, size)
    returning * into ph;
  exception when unique_violation then
    raise exception 'This photo is already saved' using errcode = '23505';
  end;

  if chosen is not null then
    insert into landmark_discoveries (profile_id, landmark_id, first_visited_at, first_gallery_photo_id)
    values (me, chosen, ph.taken_at, ph.id)
    on conflict (profile_id, landmark_id) do nothing
    returning true into is_new;
    is_new := coalesce(is_new, false);
    if not is_new then
      -- The first visit's photo was deleted: this one becomes its cover.
      update landmark_discoveries set first_gallery_photo_id = ph.id
       where profile_id = me and landmark_id = chosen and first_gallery_photo_id is null;
    end if;
    select first_visited_at into first_at from landmark_discoveries where profile_id = me and landmark_id = chosen;
    select * into lm from landmarks where id = chosen;
  end if;

  return jsonb_build_object(
    'photo_id', ph.id,
    'association_status', ph.association_status,
    'landmark', case when chosen is null then null
                     else jsonb_build_object('id', lm.id, 'name', lm.name, 'slug', lm.slug) end,
    'new_discovery', is_new,
    'first_visited_at', first_at);
end;
$$;

-- The signed-in person's visited landmarks, newest first. Always a JSON array.
create or replace function explore_my_discoveries() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'landmark_id', l.id, 'name', l.name, 'slug', l.slug, 'category', l.category,
           'first_visited_at', d.first_visited_at, 'first_photo_id', d.first_gallery_photo_id,
           'photo_count', (select count(*) from photos p where p.profile_id = d.profile_id and p.landmark_id = d.landmark_id))
         order by d.first_visited_at desc), '[]'::jsonb)
    from landmark_discoveries d
    join landmarks l on l.id = d.landmark_id
   where d.profile_id = explore_my_profile_id()
$$;

-- Gallery rows now say where a camera photo was taken (006's function, extended).
create or replace function gallery_photo_json(p photos) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id,
    'storage_path', p.storage_path,
    'city_name', p.city_name,
    'country', p.country,
    'country_code', p.country_code,
    'lat', p.lat,
    'lng', p.lng,
    'place_id', p.place_id,
    'caption', p.caption,
    'quest_id', p.quest_id,
    'hunt_id', p.hunt_id,
    'taken_at', p.taken_at,
    'width', p.width,
    'height', p.height,
    'created_at', p.created_at,
    'landmark_id', p.landmark_id,
    'landmark_name', l.name,
    'landmark_slug', l.slug,
    'association_status', p.association_status,
    'gps_accuracy_m', p.gps_accuracy_m,
    'file_size_bytes', p.file_size_bytes)
    from (select 1) one
    left join landmarks l on l.id = p.landmark_id
$$;

-- ---------------------------------------------------------------------------
-- Grants (Supabase grants new functions to anon/authenticated by default: revoke, then allow)
-- ---------------------------------------------------------------------------

revoke execute on function refresh_service_area_parts(text) from public, anon, authenticated;
revoke execute on function landmarks_touch() from public, anon, authenticated;
revoke execute on function explore_my_profile_id() from public, anon, authenticated;
revoke execute on function landmark_recommended_ids(uuid) from public, anon, authenticated;
revoke execute on function explore_evaluate_fix(uuid, double precision, double precision, double precision, timestamptz, timestamptz, boolean)
  from public, anon, authenticated;
revoke execute on function gallery_photo_json(photos) from public, anon, authenticated;
revoke execute on function landmarks_in_view(double precision, double precision, double precision, double precision, integer)
  from public, anon, authenticated;
revoke execute on function landmark_get(text) from public, anon, authenticated;
revoke execute on function explore_check_location(double precision, double precision, double precision, timestamptz, timestamptz)
  from public, anon, authenticated;
revoke execute on function explore_register_capture(text, double precision, double precision, double precision, timestamptz, timestamptz, uuid, integer, integer, integer)
  from public, anon, authenticated;
revoke execute on function explore_my_discoveries() from public, anon, authenticated;

grant execute on function landmarks_in_view(double precision, double precision, double precision, double precision, integer) to anon, authenticated;
grant execute on function landmark_get(text) to anon, authenticated;
grant execute on function explore_check_location(double precision, double precision, double precision, timestamptz, timestamptz) to authenticated;
grant execute on function explore_register_capture(text, double precision, double precision, double precision, timestamptz, timestamptz, uuid, integer, integer, integer) to authenticated;
grant execute on function explore_my_discoveries() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: the 'gallery' bucket is private (signed URLs only), and orphaned files are listed
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'No storage schema here: skipped the gallery bucket changes (fine for local tests)';
    return;
  end if;

  update storage.buckets
     set public = false, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
   where id = 'gallery';

  -- Files with no photo row, older than an hour (an upload whose registration failed and whose
  -- clean-up didn't run). Dashboard only: delete them from Storage → gallery.
  execute $q$
    create or replace view gallery_orphan_files with (security_invoker = true) as
    select o.name as storage_path, o.created_at
      from storage.objects o
     where o.bucket_id = 'gallery'
       and o.created_at < now() - interval '1 hour'
       and not exists (select 1 from public.photos p where p.storage_path = o.name)
  $q$;
  execute 'revoke all on gallery_orphan_files from anon, authenticated';
end;
$$;
