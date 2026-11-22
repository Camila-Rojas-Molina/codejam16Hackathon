-- Checks 015_messages.sql: only matched people (or hunt teammates) can message each other, length
-- and rate limits, unread/read kept on the server, the changes feed the app polls, and the owner
-- rules. Rolls back.
-- Run after the migrations (psql or the Supabase SQL editor). Prints "All message checks passed".
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

create or replace function pg_temp.person(p_user uuid, p_name text, p_mode text) returns uuid
language plpgsql as $$
declare
  pid uuid;
begin
  insert into auth.users (id, email) values (p_user, p_name || '@example.test');
  perform pg_temp.act_as(p_user);
  pid := (migo_create_account(p_name, 'sun') ->> 'id')::uuid;
  perform migo_save_record(pid, jsonb_build_object(
    'accountId', pid, 'activeMode', p_mode, 'universalCompletedAt', 1,
    'universal', jsonb_build_object('interests', jsonb_build_array('food'),
                                    'languages', jsonb_build_object('spoken', jsonb_build_array('English')))));
  return pid;
end;
$$;

-- Unread messages login p_me has from profile p_from, per the changes feed (what the app counts).
create or replace function pg_temp.unread(p_me uuid, p_from uuid) returns integer language plpgsql as $$
begin
  perform pg_temp.act_as(p_me);
  return (select count(*) from jsonb_array_elements(migo_message_changes(null) -> 'messages') x
           where x ->> 'with' = p_from::text and x ->> 'from' = 'them' and not (x ->> 'read')::boolean);
end;
$$;

do $$
declare
  tom uuid := '71000000-0000-4000-8000-000000000001';  -- tourist
  lou uuid := '71000000-0000-4000-8000-000000000002';  -- local, matched with Tom
  lea uuid := '71000000-0000-4000-8000-000000000003';  -- local, not matched
  ted uuid := '71000000-0000-4000-8000-000000000004';  -- Lea's hunt teammate
  t1 uuid; l1 uuid; l2 uuid; t2 uuid;
  cid uuid; team uuid;
  r jsonb; feed jsonb; cursor_at timestamptz;
  i int;
begin
  t1 := pg_temp.person(tom, 'Tom', 'tourist');
  l1 := pg_temp.person(lou, 'Lou', 'local');
  l2 := pg_temp.person(lea, 'Lea', 'local');
  t2 := pg_temp.person(ted, 'Ted', 'tourist');

  -- The browser can't touch the table, or the internal helpers.
  assert not has_table_privilege('anon', 'messages', 'select'), 'anon cannot read messages';
  assert not has_table_privilege('authenticated', 'messages', 'select'), 'no direct reads';
  assert not has_table_privilege('authenticated', 'messages', 'insert'), 'no direct inserts';
  assert not has_function_privilege('authenticated', 'migo_can_message(uuid, uuid)', 'execute'), 'helpers are private';
  assert not has_function_privilege('anon', 'migo_send_message(uuid, text)', 'execute'), 'anon cannot send';

  -- Not signed in: nothing works.
  perform pg_temp.act_as(null);
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', l1, 'hi')) = '42501', 'send needs a login';
  assert pg_temp.fails_with('select migo_message_changes(null)') = '42501', 'reading needs a login';
  assert pg_temp.fails_with(format('select migo_mark_messages_read(%L)', l1)) = '42501', 'marking needs a login';

  -- Not matched yet: no messaging.
  perform pg_temp.act_as(tom);
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', l1, 'hi')) = '42501', 'strangers cannot message';
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', gen_random_uuid(), 'hi')) = 'P0002', 'unknown person';

  -- Tom matches Lou: both can message.
  cid := (migo_request_connection(l1) ->> 'id')::uuid;
  r := migo_send_message(l1, '  Hi Lou! Coffee at Jean-Talon?  ');
  assert r ->> 'from' = 'me' and r ->> 'with' = l1::text, 'sent as me, to Lou';
  assert r ->> 'text' = 'Hi Lou! Coffee at Jean-Talon?', 'text is trimmed';
  assert (r ->> 'read')::boolean and not (r ->> 'seenByThem')::boolean, 'not seen by Lou yet';

  -- Length rules.
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', l1, '   ')) = '22023', 'empty refused';
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', l1, repeat('a', 501))) = '22023', 'too long refused';
  assert migo_send_message(l1, repeat('a', 500)) ->> 'text' = repeat('a', 500), '500 characters is fine';
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', t1, 'me')) = '42501', 'not to yourself';

  -- Lou sees both as unread, from Tom, with Tom's public card.
  assert pg_temp.unread(lou, t1) = 2, 'two unread for Lou';
  assert pg_temp.unread(tom, l1) = 0, 'Tom has nothing unread';
  perform pg_temp.act_as(lou);
  feed := migo_message_changes(null);
  assert feed -> 'people' -> t1::text ->> 'name' = 'Tom', 'the sender''s card comes along';
  assert (feed -> 'messages' -> 0 ->> 'text') = 'Hi Lou! Coffee at Jean-Talon?', 'oldest first';
  assert feed -> 'messages' -> 0 ->> 'from' = 'them', 'from them, for Lou';

  -- Lou replies and reads Tom's messages. The unread count drops for Lou; Tom sees the read receipt.
  perform migo_send_message(t1, 'Yes! 10am?');
  assert migo_mark_messages_read(t1) = 2, 'two marked read';
  assert migo_mark_messages_read(t1) = 0, 'marking again changes nothing';
  assert pg_temp.unread(lou, t1) = 0, 'Lou is caught up';
  assert pg_temp.unread(tom, l1) = 1, 'Tom has Lou''s reply unread';
  perform pg_temp.act_as(tom);
  assert (select bool_and((x ->> 'seenByThem')::boolean)
            from jsonb_array_elements(migo_message_changes(null) -> 'messages') x where x ->> 'from' = 'me'),
    'Tom sees his messages were read';
  -- Marking only touches messages sent TO you.
  assert migo_mark_messages_read(l1) = 1, 'Tom reads Lou''s reply';

  -- Other people never see this conversation.
  perform pg_temp.act_as(lea);
  assert jsonb_array_length(migo_message_changes(null) -> 'messages') = 0, 'Lea sees nothing';
  assert migo_mark_messages_read(t1) = 0, 'Lea cannot mark Tom''s messages read';
  assert pg_temp.unread(lou, t1) = 0 and pg_temp.unread(tom, l1) = 0, 'and nothing changed';

  -- The changes feed: only what changed after `since`.
  perform pg_temp.act_as(tom);
  feed := migo_message_changes(null);
  cursor_at := (feed ->> 'now')::timestamptz;
  assert jsonb_array_length(migo_message_changes(cursor_at) -> 'messages') = 0, 'nothing new after now';
  -- (Inside one transaction now() doesn't move, so age the existing rows instead.)
  update messages set changed_at = changed_at - interval '1 minute', created_at = created_at - interval '1 minute';
  perform pg_temp.act_as(lou);
  perform migo_send_message(t1, 'See you there');
  perform pg_temp.act_as(tom);
  feed := migo_message_changes(cursor_at - interval '10 seconds');
  assert jsonb_array_length(feed -> 'messages') = 1 and feed -> 'messages' -> 0 ->> 'text' = 'See you there', 'just the new one';
  update messages set changed_at = changed_at - interval '1 minute' where body = 'See you there';
  perform migo_mark_messages_read(l1);
  feed := migo_message_changes(cursor_at - interval '10 seconds');
  assert jsonb_array_length(feed -> 'messages') = 1 and (feed -> 'messages' -> 0 ->> 'read')::boolean, 'a read shows up as a change';

  -- Rate limit: 20 a minute per sender (older messages were aged out above).
  for i in 1 .. migo_message_rate_limit() loop
    perform migo_send_message(l1, 'ping ' || i);
  end loop;
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', l1, 'one too many')) = 'P0001', 'rate limited';
  -- The other person isn't slowed down by Tom.
  perform pg_temp.act_as(lou);
  perform migo_send_message(t1, 'slow down!');

  -- Removing the match stops new messages both ways; history stays for when they match again.
  perform migo_remove_connection(cid);
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', t1, 'still there?')) = '42501', 'no messages after removal';
  perform pg_temp.act_as(tom);
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', l1, 'hello?')) = '42501', 'either way';
  assert jsonb_array_length(migo_message_changes(null) -> 'messages') > 0, 'history kept';

  -- A local's Not now closes it too.
  perform pg_temp.act_as(tom);
  cid := (migo_request_connection(l2) ->> 'id')::uuid;
  perform pg_temp.act_as(lea);
  perform migo_respond_connection(cid, false);
  assert pg_temp.fails_with(format('select migo_send_message(%L, %L)', t1, 'hi')) = '42501', 'declined: no messages';

  -- Hunt teammates can message, whatever their modes.
  insert into teams (name) values ('Lea & Ted') returning id into team;
  insert into team_members (team_id, profile_id) values (team, l2), (team, t2);
  assert migo_send_message(t2, 'Ready for the hunt?') ->> 'from' = 'me', 'teammates can message';
  assert pg_temp.unread(ted, l2) = 1, 'Ted has it';

  -- Deleting an account deletes the messages it sent and received, nobody else's.
  perform pg_temp.act_as(ted);
  perform migo_delete_account(t2);
  assert not exists (select 1 from messages where t2 in (sender_id, recipient_id)), 'cascade on delete';
  assert exists (select 1 from messages where t1 in (sender_id, recipient_id)), 'others kept';

  raise notice 'All message checks passed';
end;
$$;

rollback;
