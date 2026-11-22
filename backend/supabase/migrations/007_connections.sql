-- 007_connections.sql: CHAT connection requests (tourist → local, the local accepts or says not now).
-- Run after 005_auth.sql (and 006). Safe to run again.
--
-- The flow
--   1. A tourist browses locals in Discover (migo_discover) and taps Connect (migo_request_connection).
--   2. The local sees the request (migo_my_connections, status 'pending', incoming) and picks
--      Connect (accept) or Not now (decline) with migo_respond_connection.
--   3. Accepted: both people see each other in Messages, and neither appears in the other's Discover.
--      Declined: the request is closed, no conversation. The tourist is told once, gently.
--   4. Either person can remove an accepted connection from Messages (migo_remove_connection). The
--      row is kept as 'removed' (history, nothing deleted); they can meet again through Discover,
--      which creates a fresh request. Messages are not stored on the server yet, so nothing else changes.
--
-- Statuses: pending → accepted | declined | cancelled (the tourist withdrew it); accepted → removed.
-- Only one live (pending or accepted) row per pair, whoever started it: a unique index on the
-- unordered pair enforces that, so double taps and two people connecting at once can't duplicate.
-- If the person you're requesting already has a pending request to you, yours accepts theirs.
--
-- Everything goes through these functions (security definer, signed-in only). The table has RLS on
-- and no grants. Errors: 42501 not signed in / not yours, P0002 unknown person or request,
-- 22023 wrong mode / not pending / declined recently.

create table if not exists connections (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles(id) on delete cascade,
  recipient_id  uuid not null references profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'cancelled', 'removed')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  updated_at    timestamptz not null default now(),
  removed_by    uuid references profiles(id) on delete set null,
  -- Whether each side has seen the latest change (drives notifications, shown once).
  requester_seen boolean not null default true,
  recipient_seen boolean not null default false,
  check (requester_id <> recipient_id)
);

create unique index if not exists connections_live_pair_idx
  on connections (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
  where status in ('pending', 'accepted');
create index if not exists connections_requester_idx on connections (requester_id);
create index if not exists connections_recipient_idx on connections (recipient_id);

alter table connections enable row level security;
revoke all on connections from anon, authenticated;

-- How long a "Not now" keeps that local out of the tourist's Discover (and blocks asking again).
create or replace function migo_decline_cooldown() returns interval
language sql immutable as $$ select interval '14 days' $$;

-- The signed-in caller's profile id. Connections always need a login.
create or replace function migo_me() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid;
begin
  if auth.uid() is null then
    raise exception 'Please log in first' using errcode = '42501';
  end if;
  select id into me from profiles where auth_user_id = auth.uid();
  if me is null then
    raise exception 'Create your profile first' using errcode = 'P0002';
  end if;
  return me;
end;
$$;

-- What anyone may see of a person, plus the public answers Discover uses to rank (see
-- frontend/src/features/profile/privacy.ts). Private answers (buddy qualities, budget, "prefers no
-- dogs", accessibility…) never leave the database.
create or replace function migo_public_person(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'id', p.id,
           'name', p.name,
           'avatar', p.avatar,
           'mode', coalesce(p.role, 'tourist'),
           'funFact', p.fun_fact,
           'interests', coalesce(m.record #> '{universal,interests}', '[]'::jsonb),
           'languages', coalesce(m.record #> '{universal,languages,spoken}', '[]'::jsonb),
           'traits', jsonb_strip_nulls(jsonb_build_object(
             'energy', m.record #>> '{universal,personality,energy}',
             'planning', m.record #>> '{universal,personality,planning}',
             'decisions', m.record #>> '{universal,personality,decisions}',
             'pace', m.record #>> '{universal,exploration,pace}',
             'groupSize', m.record #>> '{universal,exploration,groupSize}',
             'dogStance', nullif(m.record #>> '{universal,dogs,stance}', 'no-dogs'))))
    from profiles p
    left join migo_profiles m on m.profile_id = p.id
   where p.id = p_id
$$;

-- One connection as the caller sees it.
create or replace function migo_connection_json(c connections, p_me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'id', c.id,
           'status', c.status,
           'direction', case when c.requester_id = p_me then 'outgoing' else 'incoming' end,
           'createdAt', c.created_at,
           'respondedAt', c.responded_at,
           'updatedAt', c.updated_at,
           'removedByMe', c.removed_by is not null and c.removed_by = p_me,
           'seen', case when c.requester_id = p_me then c.requester_seen else c.recipient_seen end,
           'person', migo_public_person(case when c.requester_id = p_me then c.recipient_id else c.requester_id end))
$$;

-- Locals a tourist can ask to connect with. Empty unless the caller is in Tourist mode.
-- Leaves out: yourself, people you're connected with, people who've asked you (they're in your
-- requests), anyone who said "not now" to you recently, and dog mismatches (the private hard filter).
-- People you've already asked are included with "pending": true, so the app shows "Request sent".
create or replace function migo_discover() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me       uuid := migo_me();
  my_role  text;
  my_dogs  text;
begin
  select p.role, m.record #>> '{universal,dogs,stance}' into my_role, my_dogs
    from profiles p left join migo_profiles m on m.profile_id = p.id where p.id = me;
  if my_role is distinct from 'tourist' then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(migo_public_person(p.id) || jsonb_build_object(
             'pending', exists (select 1 from connections c
                                 where c.requester_id = me and c.recipient_id = p.id and c.status = 'pending'))
             order by p.created_at desc)
      from profiles p
      join migo_profiles m on m.profile_id = p.id
     where p.id <> me
       and p.role = 'local'
       and p.auth_user_id is not null
       and (m.record ->> 'universalCompletedAt') is not null
       and not (coalesce(my_dogs, '') = 'no-dogs' and coalesce(m.record #>> '{universal,dogs,stance}', '') = 'has-dog')
       and not (coalesce(my_dogs, '') = 'has-dog' and coalesce(m.record #>> '{universal,dogs,stance}', '') = 'no-dogs')
       and not exists (
             select 1 from connections c
              where least(c.requester_id, c.recipient_id) = least(me, p.id)
                and greatest(c.requester_id, c.recipient_id) = greatest(me, p.id)
                and (c.status = 'accepted'
                     or (c.status = 'pending' and c.requester_id = p.id)
                     or (c.status = 'declined' and c.requester_id = me
                         and c.responded_at > now() - migo_decline_cooldown())))
  ), '[]'::jsonb);
end;
$$;

-- Tourist → local. Returns the connection. Idempotent: asking twice returns the same pending request;
-- asking someone you're already connected with returns that connection; if they've already asked
-- you, this accepts their request instead of making a second one.
create or replace function migo_request_connection(p_recipient uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me         uuid := migo_me();
  my_role    text;
  their_role text;
  c          connections;
begin
  select role into my_role from profiles where id = me;
  select role into their_role from profiles where id = p_recipient and auth_user_id is not null;
  if not found or p_recipient = me then
    raise exception 'That person isn''t on MIGO any more' using errcode = 'P0002';
  end if;

  -- Serialise requests for this pair (two taps, or both people at once).
  perform pg_advisory_xact_lock(hashtextextended(least(me, p_recipient)::text || greatest(me, p_recipient)::text, 7));

  select * into c from connections
   where least(requester_id, recipient_id) = least(me, p_recipient)
     and greatest(requester_id, recipient_id) = greatest(me, p_recipient)
     and status in ('pending', 'accepted')
   for update;

  if found then
    if c.status = 'pending' and c.recipient_id = me then
      -- They asked first: connecting back is a yes.
      update connections
         set status = 'accepted', responded_at = now(), updated_at = now(),
             recipient_seen = true, requester_seen = false
       where id = c.id
      returning * into c;
    end if;
    return migo_connection_json(c, me);
  end if;

  if my_role is distinct from 'tourist' then
    raise exception 'Switch to Tourist mode to connect with locals' using errcode = '22023';
  end if;
  if their_role is distinct from 'local' then
    raise exception 'They''re not in Local mode right now' using errcode = '22023';
  end if;
  if exists (select 1 from connections
              where requester_id = me and recipient_id = p_recipient and status = 'declined'
                and responded_at > now() - migo_decline_cooldown()) then
    raise exception 'They''re not taking new requests from you right now' using errcode = '22023';
  end if;

  insert into connections (requester_id, recipient_id) values (me, p_recipient) returning * into c;
  return migo_connection_json(c, me);
end;
$$;

-- The local answers: true = connect, false = not now. Only the recipient, only while pending.
create or replace function migo_respond_connection(p_connection uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := migo_me();
  c  connections;
begin
  select * into c from connections where id = p_connection for update;
  if not found or c.recipient_id <> me then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if c.status <> 'pending' then
    -- Already answered (or withdrawn) elsewhere: report how it stands instead of changing it.
    return migo_connection_json(c, me);
  end if;
  update connections
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now(), updated_at = now(),
         recipient_seen = true, requester_seen = false
   where id = c.id
  returning * into c;
  return migo_connection_json(c, me);
end;
$$;

-- The tourist withdraws a request that hasn't been answered yet.
create or replace function migo_cancel_connection(p_connection uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := migo_me();
  c  connections;
begin
  select * into c from connections where id = p_connection for update;
  if not found or c.requester_id <> me then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if c.status = 'pending' then
    update connections set status = 'cancelled', updated_at = now(), recipient_seen = true
     where id = c.id returning * into c;
  end if;
  return migo_connection_json(c, me);
end;
$$;

-- Either person removes an accepted connection (from Messages).
create or replace function migo_remove_connection(p_connection uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := migo_me();
  c  connections;
begin
  select * into c from connections where id = p_connection for update;
  if not found or me not in (c.requester_id, c.recipient_id) then
    raise exception 'Connection not found' using errcode = 'P0002';
  end if;
  if c.status = 'accepted' then
    -- The other person isn't notified: they just stop seeing you in Messages.
    update connections
       set status = 'removed', removed_by = me, updated_at = now(), requester_seen = true, recipient_seen = true
     where id = c.id returning * into c;
  end if;
  return migo_connection_json(c, me);
end;
$$;

-- Every connection the caller is part of, newest change first.
create or replace function migo_my_connections() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := migo_me();
begin
  return coalesce((
    select jsonb_agg(migo_connection_json(c, me) order by c.updated_at desc)
      from connections c
     where me in (c.requester_id, c.recipient_id)
  ), '[]'::jsonb);
end;
$$;

-- Marks the given connections (or all, when null) as seen by the caller.
create or replace function migo_mark_connections_seen(p_ids uuid[] default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := migo_me();
begin
  update connections set requester_seen = true
   where requester_id = me and not requester_seen and (p_ids is null or id = any(p_ids));
  update connections set recipient_seen = true
   where recipient_id = me and not recipient_seen and status <> 'pending' and (p_ids is null or id = any(p_ids));
end;
$$;

revoke execute on function migo_decline_cooldown() from public, anon, authenticated;
revoke execute on function migo_me() from public, anon, authenticated;
revoke execute on function migo_public_person(uuid) from public, anon, authenticated;
revoke execute on function migo_connection_json(connections, uuid) from public, anon, authenticated;
revoke execute on function migo_discover() from public;
revoke execute on function migo_request_connection(uuid) from public;
revoke execute on function migo_respond_connection(uuid, boolean) from public;
revoke execute on function migo_cancel_connection(uuid) from public;
revoke execute on function migo_remove_connection(uuid) from public;
revoke execute on function migo_my_connections() from public;
revoke execute on function migo_mark_connections_seen(uuid[]) from public;
grant execute on function migo_discover() to authenticated;
grant execute on function migo_request_connection(uuid) to authenticated;
grant execute on function migo_respond_connection(uuid, boolean) to authenticated;
grant execute on function migo_cancel_connection(uuid) to authenticated;
grant execute on function migo_remove_connection(uuid) to authenticated;
grant execute on function migo_my_connections() to authenticated;
grant execute on function migo_mark_connections_seen(uuid[]) to authenticated;
