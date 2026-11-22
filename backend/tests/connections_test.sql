-- Checks 013_connections.sql: tourist → local requests, accept / not now, no duplicates, Discover
-- leaves out connected people (both sides), removal, and the owner rules. Rolls back.
-- Run after the migrations (psql or the Supabase SQL editor). Prints "All connection checks passed".
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

-- A signed-in person with a finished profile in the given mode. Returns the profile id.
create or replace function pg_temp.person(p_user uuid, p_name text, p_mode text, p_dogs text default 'neutral') returns uuid
language plpgsql as $$
declare
  pid uuid;
begin
  insert into auth.users (id, email) values (p_user, p_name || '@example.test');
  perform pg_temp.act_as(p_user);
  pid := (migo_create_account(p_name, 'sun') ->> 'id')::uuid;
  perform migo_save_record(pid, jsonb_build_object(
    'accountId', pid, 'activeMode', p_mode, 'universalCompletedAt', 1,
    'universal', jsonb_build_object(
      'interests', jsonb_build_array('food'), 'languages', jsonb_build_object('spoken', jsonb_build_array('English')),
      'personality', jsonb_build_object('energy', 'ambivert'), 'companion', jsonb_build_object('qualities', jsonb_build_array('funny')),
      'dogs', jsonb_build_object('stance', p_dogs))));
  return pid;
end;
$$;

do $$
declare
  tom   uuid := '70000000-0000-4000-8000-000000000001';  -- tourist
  tia   uuid := '70000000-0000-4000-8000-000000000002';  -- tourist
  lou   uuid := '70000000-0000-4000-8000-000000000003';  -- local
  lea   uuid := '70000000-0000-4000-8000-000000000004';  -- local
  dan   uuid := '70000000-0000-4000-8000-000000000005';  -- local with a dog
  t1 uuid; t2 uuid; l1 uuid; l2 uuid; d1 uuid;
  r jsonb; r2 jsonb; ids jsonb;
  cid uuid;
begin
  t1 := pg_temp.person(tom, 'Tom', 'tourist', 'no-dogs');
  t2 := pg_temp.person(tia, 'Tia', 'tourist');
  l1 := pg_temp.person(lou, 'Lou', 'local');
  l2 := pg_temp.person(lea, 'Lea', 'local');
  d1 := pg_temp.person(dan, 'Dan', 'local', 'has-dog');

  -- The browser can't touch the table.
  assert not has_table_privilege('anon', 'connections', 'select'), 'anon cannot read connections';
  assert not has_table_privilege('authenticated', 'connections', 'insert'), 'no direct inserts';

  -- Not signed in: nothing works.
  perform pg_temp.act_as(null);
  assert pg_temp.fails_with('select migo_discover()') = '42501', 'discover needs a login';
  assert pg_temp.fails_with(format('select migo_request_connection(%L)', l1)) = '42501', 'request needs a login';

  -- Discover: Tom (tourist, prefers no dogs) sees Lou and Lea, not Dan (dog owner), not tourists, not himself.
  perform pg_temp.act_as(tom);
  ids := (select jsonb_agg(x ->> 'id') from jsonb_array_elements(migo_discover()) x);
  assert ids @> to_jsonb(array[l1::text, l2::text]), 'tourist sees locals';
  assert not ids @> to_jsonb(array[d1::text]), 'dog filter applies';
  assert not ids @> to_jsonb(array[t2::text]) and not ids @> to_jsonb(array[t1::text]), 'no tourists, not yourself';
  -- Private answers never leave the database.
  r := (select x from jsonb_array_elements(migo_discover()) x where x ->> 'id' = l1::text);
  assert r -> 'traits' ->> 'energy' = 'ambivert', 'public traits are shared';
  assert r::text not like '%qualities%' and r::text not like '%funny%', 'buddy qualities stay private';

  -- Locals don't browse: their Discover is empty.
  perform pg_temp.act_as(lou);
  assert jsonb_array_length(migo_discover()) = 0, 'locals get no Discover list';
  -- And a local can't start a request.
  assert pg_temp.fails_with(format('select migo_request_connection(%L)', l2)) = '22023', 'locals cannot request';

  -- Tom asks Lou. Asking again returns the same request (no duplicate).
  perform pg_temp.act_as(tom);
  r := migo_request_connection(l1);
  cid := (r ->> 'id')::uuid;
  assert r ->> 'status' = 'pending' and r ->> 'direction' = 'outgoing', 'request is pending';
  r2 := migo_request_connection(l1);
  assert (r2 ->> 'id')::uuid = cid, 'asking twice returns the same request';
  assert (select count(*) from connections where requester_id = t1 and recipient_id = l1) = 1, 'one row';
  -- Discover still lists Lou, flagged as already asked.
  r := (select x from jsonb_array_elements(migo_discover()) x where x ->> 'id' = l1::text);
  assert (r ->> 'pending')::boolean, 'Discover shows the request as sent';
  -- Can't ask a tourist.
  assert pg_temp.fails_with(format('select migo_request_connection(%L)', t2)) = '22023', 'only locals can be asked';

  -- Lou sees it as a new incoming request. Only Lou can answer it.
  perform pg_temp.act_as(lou);
  r := (select x from jsonb_array_elements(migo_my_connections()) x where (x ->> 'id')::uuid = cid);
  assert r ->> 'direction' = 'incoming' and r ->> 'status' = 'pending' and not (r ->> 'seen')::boolean, 'incoming and unseen';
  assert r -> 'person' ->> 'name' = 'Tom', 'shows who asked';
  perform pg_temp.act_as(tia);
  assert pg_temp.fails_with(format('select migo_respond_connection(%L, true)', cid)) = 'P0002', 'others cannot answer';
  perform pg_temp.act_as(tom);
  assert pg_temp.fails_with(format('select migo_respond_connection(%L, true)', cid)) = 'P0002', 'the requester cannot answer';

  -- Lou accepts. Answering again doesn't change it.
  perform pg_temp.act_as(lou);
  r := migo_respond_connection(cid, true);
  assert r ->> 'status' = 'accepted', 'accepted';
  r := migo_respond_connection(cid, false);
  assert r ->> 'status' = 'accepted', 'a second answer is ignored';

  -- Tom is told once; then it's seen.
  perform pg_temp.act_as(tom);
  r := (select x from jsonb_array_elements(migo_my_connections()) x where (x ->> 'id')::uuid = cid);
  assert r ->> 'status' = 'accepted' and not (r ->> 'seen')::boolean, 'requester sees the news';
  perform migo_mark_connections_seen(null);
  r := (select x from jsonb_array_elements(migo_my_connections()) x where (x ->> 'id')::uuid = cid);
  assert (r ->> 'seen')::boolean, 'marked seen';

  -- Connected: Lou is gone from Tom's Discover. Asking again just returns the connection.
  ids := (select coalesce(jsonb_agg(x ->> 'id'), '[]') from jsonb_array_elements(migo_discover()) x);
  assert not ids @> to_jsonb(array[l1::text]), 'connected people leave Discover';
  assert (migo_request_connection(l1) ->> 'id')::uuid = cid, 'no second connection';

  -- If Lou switches to Tourist mode, Tom (when local) doesn't show up in Lou's Discover either.
  perform pg_temp.act_as(tom);
  perform migo_save_record(t1, (select record from migo_profiles where profile_id = t1) || '{"activeMode":"local"}');
  perform pg_temp.act_as(lou);
  perform migo_save_record(l1, (select record from migo_profiles where profile_id = l1) || '{"activeMode":"tourist"}');
  ids := (select coalesce(jsonb_agg(x ->> 'id'), '[]') from jsonb_array_elements(migo_discover()) x);
  assert not ids @> to_jsonb(array[t1::text]), 'hidden on both sides';
  perform migo_save_record(l1, (select record from migo_profiles where profile_id = l1) || '{"activeMode":"local"}');
  perform pg_temp.act_as(tom);
  perform migo_save_record(t1, (select record from migo_profiles where profile_id = t1) || '{"activeMode":"tourist"}');

  -- Removing: only the two people involved. The row stays (as 'removed'), and Lou is discoverable again.
  perform pg_temp.act_as(tia);
  assert pg_temp.fails_with(format('select migo_remove_connection(%L)', cid)) = 'P0002', 'others cannot remove';
  perform pg_temp.act_as(lou);
  r := migo_remove_connection(cid);
  assert r ->> 'status' = 'removed' and (r ->> 'removedByMe')::boolean, 'removed by Lou';
  perform pg_temp.act_as(tom);
  ids := (select coalesce(jsonb_agg(x ->> 'id'), '[]') from jsonb_array_elements(migo_discover()) x);
  assert ids @> to_jsonb(array[l1::text]), 'removed people can be discovered again';
  assert (select count(*) from connections where id = cid) = 1, 'history is kept';
  -- A new request is a new row (the old one stays removed).
  r := migo_request_connection(l1);
  assert (r ->> 'id')::uuid <> cid and r ->> 'status' = 'pending', 'fresh request after removal';
  perform migo_cancel_connection((r ->> 'id')::uuid);

  -- Not now: closed, no conversation, and Lea drops out of Tia's Discover for a while.
  perform pg_temp.act_as(tia);
  cid := (migo_request_connection(l2) ->> 'id')::uuid;
  perform pg_temp.act_as(lea);
  r := migo_respond_connection(cid, false);
  assert r ->> 'status' = 'declined', 'declined';
  perform pg_temp.act_as(tia);
  ids := (select coalesce(jsonb_agg(x ->> 'id'), '[]') from jsonb_array_elements(migo_discover()) x);
  assert not ids @> to_jsonb(array[l2::text]), 'declined locals leave Discover for a while';
  assert pg_temp.fails_with(format('select migo_request_connection(%L)', l2)) = '22023', 'no asking again right away';

  -- Both at once: Lea (now a tourist) asks Tom while Tom (now a local) has an open request to her?
  -- Simpler real case: Tom asks Lea; Lea, before answering, taps Connect on Tom → that accepts.
  perform pg_temp.act_as(tom);
  cid := (migo_request_connection(l2) ->> 'id')::uuid;
  perform pg_temp.act_as(lea);
  r := migo_request_connection(t1);
  assert (r ->> 'id')::uuid = cid and r ->> 'status' = 'accepted', 'connecting back accepts the pending request';
  assert (select count(*) from connections
           where least(requester_id, recipient_id) = least(t1, l2)
             and greatest(requester_id, recipient_id) = greatest(t1, l2)
             and status in ('pending', 'accepted')) = 1, 'still one live row for the pair';

  -- The database itself refuses a second live row for a pair.
  assert pg_temp.fails_with(format('insert into connections (requester_id, recipient_id) values (%L, %L)', l2, t1)) = '23505',
    'unique live pair';

  -- Cancel: only the requester, only while pending.
  perform pg_temp.act_as(tia);
  cid := (migo_request_connection(l1) ->> 'id')::uuid;
  perform pg_temp.act_as(lou);
  assert pg_temp.fails_with(format('select migo_cancel_connection(%L)', cid)) = 'P0002', 'recipient cannot cancel';
  perform pg_temp.act_as(tia);
  assert migo_cancel_connection(cid) ->> 'status' = 'cancelled', 'cancelled';
  perform pg_temp.act_as(lou);
  assert migo_respond_connection(cid, true) ->> 'status' = 'cancelled', 'a cancelled request cannot be accepted';

  -- Deleting an account deletes its connections (cascade), nobody else's.
  perform pg_temp.act_as(tia);
  perform migo_delete_account(t2);
  assert not exists (select 1 from connections where t2 in (requester_id, recipient_id)), 'cascade on delete';
  assert exists (select 1 from connections where t1 in (requester_id, recipient_id)), 'others kept';

  raise notice 'All connection checks passed';
end;
$$;

rollback;
