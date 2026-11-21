-- Travel Quest backend: tables, scoring, matching and the GPS check.
-- Runs on Supabase (Postgres). Paste into the SQL editor, or use `supabase db push`.
--
-- Design:
--   * The browser only READS tables (hunts, leaderboard).
--   * Every WRITE goes through a function below, so the server decides points and
--     checks location. The client can't just send "I scored 9000".
--   * No login yet (hackathon). A profile id lives in the browser's localStorage.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 20),
  avatar              text not null,
  role                text not null check (role in ('tourist', 'local')),
  fun_fact            text,
  has_dog             boolean not null default false,
  -- Same values as AccessibilityNeed in frontend/src/features/accessibility/types.ts
  accessibility_needs text[] not null default '{}'
    check (accessibility_needs <@ array['mobility', 'visual', 'hearing', 'cognitive']),
  -- Waiting in the match queue since this time. Null = not looking for a partner.
  looking_since       timestamptz,
  created_at          timestamptz not null default now()
);

create table if not exists hunts (
  id                  text primary key,                 -- e.g. 'roddick-gates'
  title               text not null,
  photo               text not null,                    -- /assets/hunts/<id>.jpg
  lat                 double precision not null,
  lng                 double precision not null,
  time_limit_sec      integer not null check (time_limit_sec > 0),
  base_points         integer not null check (base_points >= 0),
  difficulty          text not null check (difficulty in ('easy', 'medium', 'hard')),
  reveal_text         text not null,
  -- 'dog-park' hunts are only shown to teams with a dog owner.
  kind                text not null default 'landmark'
    check (kind in ('landmark', 'mystery', 'dog-park', 'accessibility')),
  -- Needs this place is suitable for. Hunts matching a player's needs are shown first.
  accessible_for      text[] not null default '{}'
    check (accessible_for <@ array['mobility', 'visual', 'hearing', 'cognitive']),
  active              boolean not null default true
);

create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- Starting points for seeded demo teams so the leaderboard isn't empty. 0 for real teams.
  seed_points integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists team_members (
  team_id     uuid not null references teams(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  primary key (team_id, profile_id)
);
create index if not exists team_members_profile_idx on team_members(profile_id);

create table if not exists submissions (
  id                  uuid primary key default gen_random_uuid(),
  team_id             uuid not null references teams(id) on delete cascade,
  hunt_id             text not null references hunts(id) on delete cascade,
  lat                 double precision,
  lng                 double precision,
  distance_m          double precision,                 -- how far from the target they were
  seconds_left        integer not null,
  selfie_path         text,                             -- path in the 'selfies' storage bucket
  demo                boolean not null default false,   -- arrival was simulated (judging indoors)
  find_rank           integer not null,                 -- 1 = first team ever to find this spot
  base                integer not null,
  speed_bonus         integer not null,
  met_someone_bonus   integer not null,
  first_finder_bonus  integer not null,
  total               integer not null,
  created_at          timestamptz not null default now(),
  unique (team_id, hunt_id)                             -- each team scores a hunt once
);
create index if not exists submissions_hunt_idx on submissions(hunt_id);

-- ---------------------------------------------------------------------------
-- Rules (keep in sync with frontend/src/lib/geo.ts and features/scoring/score.ts)
-- ---------------------------------------------------------------------------

create or replace function arrival_radius_m() returns double precision
language sql immutable as $$ select 75::double precision $$;

-- Haversine distance in metres. Same formula as distanceMeters() in geo.ts.
create or replace function distance_m(lat1 double precision, lng1 double precision,
                                      lat2 double precision, lng2 double precision)
returns double precision
language sql immutable as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )))
$$;

-- Bonus for being early: 1st team +100, 2nd +50, 3rd +25, then nothing.
create or replace function first_finder_bonus(find_rank integer) returns integer
language sql immutable as $$
  select case find_rank when 1 then 100 when 2 then 50 when 3 then 25 else 0 end
$$;

-- Fun team name from the two member ids (stable, like teamName() in store/state.ts).
create or replace function make_team_name(a uuid, b uuid) returns text
language sql immutable as $$
  select 'The '
    || (array['Wandering','Lucky','Sneaky','Brave','Curious','Speedy','Midnight','Rooftop'])
         [1 + abs(hashtext(a::text || b::text)) % 8]
    || ' '
    || (array['Pigeons','Raccoons','Squirrels','Bagels','Beavers','Gulls','Maples','Cyclists'])
         [1 + abs(hashtext(b::text || a::text)) % 8]
$$;

-- ---------------------------------------------------------------------------
-- Read model
-- ---------------------------------------------------------------------------

-- Leaderboard: one row per team with both members and total points.
create or replace view leaderboard with (security_invoker = false) as
select
  t.id,
  t.name,
  (t.seed_points + coalesce((select sum(s.total) from submissions s where s.team_id = t.id), 0))::integer as points,
  coalesce((select array_agg(s.hunt_id order by s.created_at) from submissions s where s.team_id = t.id),
           '{}') as completed_hunt_ids,
  (select jsonb_agg(jsonb_build_object(
            'id', p.id, 'name', p.name, 'avatar', p.avatar, 'role', p.role, 'funFact', p.fun_fact)
          order by p.role desc)
     from team_members m join profiles p on p.id = m.profile_id
    where m.team_id = t.id) as members
from teams t;

-- ---------------------------------------------------------------------------
-- API functions (called from the browser with supabase.rpc / POST /rest/v1/rpc/<name>)
-- ---------------------------------------------------------------------------

-- Onboarding: create a player. Returns the new profile.
create or replace function create_profile(
  p_name text,
  p_avatar text,
  p_role text,
  p_fun_fact text default null,
  p_has_dog boolean default false,
  p_accessibility_needs text[] default '{}'
) returns profiles
language sql security definer set search_path = public as $$
  insert into profiles (name, avatar, role, fun_fact, has_dog, accessibility_needs)
  values (trim(p_name), p_avatar, p_role, p_fun_fact, p_has_dog, coalesce(p_accessibility_needs, '{}'))
  returning *;
$$;

-- Matching: pair this player with someone of the opposite role who is waiting.
-- Preference order: same dog status, then shared accessibility needs, then whoever
-- has waited longest. Dani can replace the ORDER BY with the real matching algorithm.
--
-- Returns the team as JSON, or null if nobody is waiting yet. In that case the player
-- is now in the queue: call again every few seconds (or fall back to a mock partner).
create or replace function find_partner(p_profile_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me       profiles;
  partner  profiles;
  team_id  uuid;
begin
  select * into me from profiles where id = p_profile_id;
  if not found then
    raise exception 'Unknown profile %', p_profile_id using errcode = 'P0002';
  end if;

  -- Already on a team? Return it (makes polling safe to repeat).
  select m.team_id into team_id from team_members m where m.profile_id = me.id limit 1;
  if team_id is not null then
    return (select to_jsonb(l) from leaderboard l where l.id = team_id);
  end if;

  -- Lock the partner row so two people can't grab the same partner at once.
  select p.* into partner
    from profiles p
   where p.role <> me.role
     and p.looking_since is not null
     and p.id <> me.id
     and not exists (select 1 from team_members m where m.profile_id = p.id)
   order by (p.has_dog = me.has_dog) desc,
            (p.accessibility_needs && me.accessibility_needs) desc,
            p.looking_since asc
   limit 1
   for update skip locked;

  if not found then
    update profiles set looking_since = coalesce(looking_since, now()) where id = me.id;
    return null;
  end if;

  insert into teams (name) values (make_team_name(me.id, partner.id)) returning id into team_id;
  insert into team_members (team_id, profile_id) values (team_id, me.id), (team_id, partner.id);
  update profiles set looking_since = null where id in (me.id, partner.id);

  return (select to_jsonb(l) from leaderboard l where l.id = team_id);
end;
$$;

-- Hunts for a player, nearest first. Dog park hunts only for dog owners;
-- places suited to the player's accessibility needs come first.
create or replace function get_hunts(
  p_profile_id uuid default null,
  p_lat double precision default null,
  p_lng double precision default null
) returns setof hunts
language sql stable security definer set search_path = public as $$
  select h.*
    from hunts h
    left join profiles me on me.id = p_profile_id
   where h.active
     and (h.kind <> 'dog-park' or coalesce(me.has_dog, false))
   order by
     (h.accessible_for && coalesce(me.accessibility_needs, '{}')) desc,
     case when p_lat is null or p_lng is null then 0
          else distance_m(p_lat, p_lng, h.lat, h.lng) end,
     h.base_points;
$$;

-- Selfie check-in: checks the team is at the spot, then scores it.
--   p_demo = true skips the GPS check (the "Simulate arrival" button for judging).
-- Points = base + speed bonus + met-someone-new bonus + first-finder bonus.
create or replace function submit_selfie(
  p_team_id uuid,
  p_hunt_id text,
  p_seconds_left integer,
  p_lat double precision default null,
  p_lng double precision default null,
  p_selfie_path text default null,
  p_demo boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  h          hunts;
  dist       double precision;
  left_sec   integer;
  rank       integer;
  s_base     integer;
  s_speed    integer;
  s_met      integer := 50;
  s_first    integer;
  existing   submissions;
begin
  select * into h from hunts where id = p_hunt_id and active;
  if not found then
    raise exception 'Unknown hunt %', p_hunt_id using errcode = 'P0002';
  end if;
  if not exists (select 1 from teams where id = p_team_id) then
    raise exception 'Unknown team %', p_team_id using errcode = 'P0002';
  end if;

  -- Already scored this hunt? Return the original result instead of scoring twice.
  select * into existing from submissions where team_id = p_team_id and hunt_id = p_hunt_id;
  if found then
    return jsonb_build_object(
      'base', existing.base, 'speedBonus', existing.speed_bonus,
      'metSomeoneBonus', existing.met_someone_bonus,
      'firstFinderBonus', existing.first_finder_bonus,
      'total', existing.total, 'findRank', existing.find_rank,
      'alreadySubmitted', true);
  end if;

  if p_lat is not null and p_lng is not null then
    dist := distance_m(p_lat, p_lng, h.lat, h.lng);
  end if;

  if not p_demo and (dist is null or dist > arrival_radius_m()) then
    raise exception 'Not at the spot yet (% m away)', coalesce(round(dist)::text, 'unknown')
      using errcode = 'P0001', hint = 'too_far';
  end if;

  -- Serialize submissions per hunt so two teams can't both be "first".
  perform pg_advisory_xact_lock(hashtext('hunt:' || p_hunt_id));
  select count(*) + 1 into rank from submissions where hunt_id = p_hunt_id;

  left_sec := least(h.time_limit_sec, greatest(0, coalesce(p_seconds_left, 0)));
  s_base   := h.base_points;
  s_speed  := round(s_base::numeric * left_sec / h.time_limit_sec * 0.5);
  s_first  := first_finder_bonus(rank);

  insert into submissions (team_id, hunt_id, lat, lng, distance_m, seconds_left, selfie_path, demo,
                           find_rank, base, speed_bonus, met_someone_bonus, first_finder_bonus, total)
  values (p_team_id, p_hunt_id, p_lat, p_lng, dist, left_sec, p_selfie_path, p_demo,
          rank, s_base, s_speed, s_met, s_first, s_base + s_speed + s_met + s_first);

  return jsonb_build_object(
    'base', s_base, 'speedBonus', s_speed, 'metSomeoneBonus', s_met,
    'firstFinderBonus', s_first, 'total', s_base + s_speed + s_met + s_first,
    'findRank', rank, 'alreadySubmitted', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Security: read-only tables, writes only through the functions above
-- ---------------------------------------------------------------------------

alter table profiles     enable row level security;
alter table hunts        enable row level security;
alter table teams        enable row level security;
alter table team_members enable row level security;
alter table submissions  enable row level security;

drop policy if exists "hunts are public" on hunts;
create policy "hunts are public" on hunts for select using (active);

drop policy if exists "teams are public" on teams;
create policy "teams are public" on teams for select using (true);

-- Profiles, team_members and submissions have no select policy for the browser:
-- they are only exposed through the leaderboard view and the functions.

revoke all on profiles, hunts, teams, team_members, submissions from anon, authenticated;
grant select on hunts, teams to anon, authenticated;
grant select on leaderboard to anon, authenticated;

revoke execute on function create_profile(text, text, text, text, boolean, text[]) from public;
revoke execute on function find_partner(uuid) from public;
revoke execute on function get_hunts(uuid, double precision, double precision) from public;
revoke execute on function submit_selfie(uuid, text, integer, double precision, double precision, text, boolean) from public;

grant execute on function create_profile(text, text, text, text, boolean, text[]) to anon, authenticated;
grant execute on function find_partner(uuid) to anon, authenticated;
grant execute on function get_hunts(uuid, double precision, double precision) to anon, authenticated;
grant execute on function submit_selfie(uuid, text, integer, double precision, double precision, text, boolean) to anon, authenticated;
