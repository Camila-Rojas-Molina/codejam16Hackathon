-- 015_messages.sql: CHAT messages, stored on the server so the other person actually gets them.
-- Run after 013_connections.sql (and 014). Safe to run again.
--
-- Who can message whom
--   Two people can message each other while they're matched (an accepted connection, 013) or hunt
--   teammates (the same team in team_members, 001). A removed or declined match can't be messaged;
--   the history is kept, so matching again later brings the conversation back.
--
-- How the app uses it (no Realtime needed; that can come later)
--   * migo_send_message(to, text) saves one message and returns it.
--   * migo_message_changes(since) returns every message involving the caller that was sent or read
--     after `since` (all recent ones when null), plus a server timestamp. The app polls it every few
--     seconds while Chat is open, passing back that timestamp minus a small overlap and dropping
--     duplicates by id, so a message whose transaction committed late is still picked up.
--   * migo_mark_messages_read(with) marks everything that person sent you as read. Unread counts
--     come from read_at, so they agree on every device (and read receipts are possible later).
--
-- Limits: 1–500 characters (MESSAGE_MAX_LENGTH in the app), and at most migo_message_rate_limit()
-- messages per sender per minute.
--
-- Everything goes through these functions (security definer, signed-in only). The table has RLS on
-- and no grants. Errors: 42501 not signed in / not matched, P0002 unknown person,
-- 22023 empty or too long, P0001 with hint 'rate_limited' when sending too fast.

create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references profiles(id) on delete cascade,
  recipient_id  uuid not null references profiles(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 500),
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  -- Last time this row changed (sent, then read). migo_message_changes reads by it.
  changed_at    timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists messages_pair_idx
  on messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
create index if not exists messages_sender_changed_idx on messages (sender_id, changed_at);
create index if not exists messages_recipient_changed_idx on messages (recipient_id, changed_at);
create index if not exists messages_unread_idx on messages (recipient_id, sender_id) where read_at is null;

alter table messages enable row level security;
revoke all on messages from anon, authenticated;

-- Messages one person may send per minute.
create or replace function migo_message_rate_limit() returns integer
language sql immutable as $$ select 20 $$;

-- True if these two people may message each other right now.
create or replace function migo_can_message(p_me uuid, p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_me <> p_other and (
    exists (select 1 from connections c
             where least(c.requester_id, c.recipient_id) = least(p_me, p_other)
               and greatest(c.requester_id, c.recipient_id) = greatest(p_me, p_other)
               and c.status = 'accepted')
    or exists (select 1 from team_members a
                 join team_members b on b.team_id = a.team_id
                where a.profile_id = p_me and b.profile_id = p_other))
$$;

-- One message as the caller sees it.
create or replace function migo_message_json(m messages, p_me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'id', m.id,
           'with', case when m.sender_id = p_me then m.recipient_id else m.sender_id end,
           'from', case when m.sender_id = p_me then 'me' else 'them' end,
           'text', m.body,
           'at', m.created_at,
           -- Your own messages are always "read" for you; seenByThem is the read receipt.
           'read', m.sender_id = p_me or m.read_at is not null,
           'seenByThem', m.sender_id = p_me and m.read_at is not null)
$$;

-- Sends a message to someone you're matched with (or a hunt teammate). Returns the message.
create or replace function migo_send_message(p_to uuid, p_text text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me    uuid := migo_me();
  clean text := btrim(coalesce(p_text, ''), E' \t\r\n');
  m     messages;
begin
  if not exists (select 1 from profiles where id = p_to) then
    raise exception 'That person isn''t on MIGO any more' using errcode = 'P0002';
  end if;
  if clean = '' then
    raise exception 'Write something first' using errcode = '22023';
  end if;
  if char_length(clean) > 500 then
    raise exception 'Messages can be up to 500 characters' using errcode = '22023';
  end if;
  if not migo_can_message(me, p_to) then
    raise exception 'You can only message people you''re matched with' using errcode = '42501';
  end if;

  -- One send at a time per person, so the rate limit can't be raced.
  perform pg_advisory_xact_lock(hashtextextended(me::text, 15));
  if (select count(*) from messages where sender_id = me and created_at > now() - interval '1 minute')
       >= migo_message_rate_limit() then
    raise exception 'You''re sending messages too fast. Wait a moment and try again.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into messages (sender_id, recipient_id, body) values (me, p_to, clean) returning * into m;
  return migo_message_json(m, me);
end;
$$;

-- Messages involving the caller that were sent or read after p_since (null = the most recent ones),
-- oldest first, at most 1000. Returns {now, messages, people}: `now` is the server time to pass back
-- (minus a few seconds of overlap) next time, `people` the public card of everyone in `messages`.
create or replace function migo_message_changes(p_since timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me   uuid := migo_me();
  rows jsonb;
begin
  with mine as (
    select m.* from messages m
     where m.sender_id = me and (p_since is null or m.changed_at > p_since)
    union all
    select m.* from messages m
     where m.recipient_id = me and (p_since is null or m.changed_at > p_since)
  ), picked as (
    select * from mine order by changed_at desc limit 1000
  )
  select coalesce(jsonb_agg(migo_message_json(p, me) order by p.created_at, p.id), '[]'::jsonb)
    into rows from picked p;

  return jsonb_build_object(
    'now', now(),
    'messages', rows,
    'people', coalesce((
      select jsonb_object_agg(w, migo_public_person(w::uuid))
        from (select distinct x ->> 'with' as w from jsonb_array_elements(rows) x) ids
    ), '{}'::jsonb));
end;
$$;

-- Marks everything p_with sent the caller as read. Returns how many were newly marked.
create or replace function migo_mark_messages_read(p_with uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  me uuid := migo_me();
  n  integer;
begin
  update messages set read_at = now(), changed_at = now()
   where recipient_id = me and sender_id = p_with and read_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function migo_message_rate_limit() from public, anon, authenticated;
revoke execute on function migo_can_message(uuid, uuid) from public, anon, authenticated;
revoke execute on function migo_message_json(messages, uuid) from public, anon, authenticated;
revoke execute on function migo_send_message(uuid, text) from public;
revoke execute on function migo_message_changes(timestamptz) from public;
revoke execute on function migo_mark_messages_read(uuid) from public;
grant execute on function migo_send_message(uuid, text) to authenticated;
grant execute on function migo_message_changes(timestamptz) to authenticated;
grant execute on function migo_mark_messages_read(uuid) to authenticated;
