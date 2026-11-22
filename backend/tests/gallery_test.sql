-- Checks 006_gallery.sql: photos are private to their login, listed newest first, deletable. Rolls back.
-- Run in the Supabase SQL editor (or psql) after the migrations. Prints "All gallery checks passed".
-- Only the database side is tested (the storage bucket and its policies need Supabase Storage).
-- Users are simulated by inserting into auth.users and setting the JWT claims that auth.uid() reads.
begin;

create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    case when p_user is null then '' else
                      jsonb_build_object('sub', p_user, 'role', 'authenticated')::text end, true),
         set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
$$;

-- Runs a statement and returns the SQLSTATE it failed with ('' if it worked).
create or replace function pg_temp.fails_with(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return '';
exception when others then
  return sqlstate;
end;
$$;

do $$
declare
  alice   uuid := 'a11ce000-0000-4000-8000-0000000000a1';
  bob     uuid := 'b0b00000-0000-4000-8000-0000000000b2';
  apid    uuid;
  bpid    uuid;
  legacy  uuid;
  photo   jsonb;
  list    jsonb;
  p1      uuid;
  p2      uuid;
  path    text;
begin
  insert into auth.users (id, email) values (alice, 'alice@example.test'), (bob, 'bob@example.test');

  -- The browser can't touch the table directly.
  assert not has_table_privilege('anon', 'photos', 'select'), 'anon cannot read photos';
  assert not has_table_privilege('authenticated', 'photos', 'select'), 'authenticated cannot read photos';
  assert not has_table_privilege('authenticated', 'photos', 'insert'), 'authenticated cannot insert photos';
  assert not has_function_privilege('anon', 'gallery_add_photo(uuid, text, jsonb)', 'execute'), 'anon cannot add';

  perform pg_temp.act_as(null);
  legacy := (migo_create_account('Legacy', 'cat') ->> 'id')::uuid;
  perform pg_temp.act_as(bob);
  bpid := (migo_create_account('Bob', 'fox') ->> 'id')::uuid;
  perform pg_temp.act_as(alice);
  apid := (migo_create_account('Alice', 'owl') ->> 'id')::uuid;

  assert gallery_list(apid) = '[]'::jsonb, 'empty gallery is an empty array';

  -- Alice saves three photos, out of order.
  photo := gallery_add_photo(apid, alice || '/one.jpg', jsonb_build_object(
    'city_name', ' Lisbon ', 'country', 'Portugal', 'country_code', 'pt', 'lat', 38.72, 'lng', -9.14,
    'place_id', 'geonames:2267057', 'caption', '  Tram 28  ', 'taken_at', '2026-05-01T10:00:00Z',
    'width', 1600, 'height', 1200, 'quest_id', 'daily-1'));
  p1 := (photo ->> 'id')::uuid;
  assert photo ->> 'city_name' = 'Lisbon', 'city trimmed';
  assert photo ->> 'country_code' = 'PT', 'country code uppercased';
  assert photo ->> 'caption' = 'Tram 28', 'caption trimmed';
  assert (photo ->> 'width')::int = 1600 and (photo ->> 'lat')::float8 = 38.72, 'numbers stored';
  assert photo ->> 'storage_path' = alice || '/one.jpg', 'path returned';

  photo := gallery_add_photo(apid, alice || '/two.webp', jsonb_build_object('taken_at', '2026-06-01T10:00:00Z', 'hunt_id', 'roddick-gates'));
  p2 := (photo ->> 'id')::uuid;
  assert photo ->> 'city_name' is null and photo ->> 'caption' is null, 'missing details are null';
  photo := gallery_add_photo(apid, alice || '/three.png', null);
  assert (photo ->> 'taken_at')::timestamptz <= now() and (photo ->> 'taken_at')::timestamptz > now() - interval '1 minute',
    'taken_at defaults to now';
  photo := gallery_add_photo(apid, alice || '/future.jpg', '{"taken_at": "2999-01-01T00:00:00Z"}');
  assert (photo ->> 'taken_at')::timestamptz <= now(), 'taken_at is never in the future';

  -- Newest first.
  list := gallery_list(apid);
  assert jsonb_array_length(list) = 4, 'four photos';
  assert list -> 2 ->> 'id' = p2::text and list -> 3 ->> 'id' = p1::text, 'newest first, oldest last';
  assert (list -> 0 ->> 'taken_at')::timestamptz >= (list -> 1 ->> 'taken_at')::timestamptz, 'ordered by taken_at';

  -- Bad input.
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, null)', apid, alice || '/one.jpg')) = '23505', 'same path twice';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, null)', apid, bob || '/x.jpg')) = '42501', 'someone else''s folder';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, null)', apid, 'x.jpg')) = '42501', 'no folder';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, null)', apid, alice || '/../x.jpg')) = '22023', 'path traversal';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, null)', apid, alice || '/x.gif')) = '22023', 'wrong extension';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, %L)', apid, alice || '/c.jpg',
    jsonb_build_object('caption', repeat('a', 201)))) = '22023', 'caption over 200';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, %L)', apid, alice || '/c.jpg',
    jsonb_build_object('caption', repeat('a', 200)))) = '', 'caption of exactly 200 is fine';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, %L)', apid, alice || '/d.jpg', '{"lat": 120}')) = '22023', 'lat out of range';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, %L)', apid, alice || '/d.jpg', '{"width": "wide"}')) = '22023', 'width not a number';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, %L)', apid, alice || '/d.jpg', '{"country_code": "PRT"}')) = '22023', 'country code';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, %L)', apid, alice || '/d.jpg', '{"taken_at": "soon"}')) = '22023', 'taken_at';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, %L)', apid, alice || '/d.jpg', '[1]')) = '22023', 'meta not an object';
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, null)', gen_random_uuid(), alice || '/d.jpg')) = 'P0002', 'unknown profile';
  -- A profile without a login can't have photos, even for a signed-in caller.
  assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, null)', legacy, alice || '/d.jpg')) = '42501', 'unlinked profile';
  assert jsonb_array_length(gallery_list(apid)) = 5, 'failed adds saved nothing';

  -- Bob, then an anonymous caller, can't see, add to or delete from Alice's gallery.
  for i in 1..2 loop
    perform pg_temp.act_as(case when i = 1 then bob end);
    assert pg_temp.fails_with(format('select gallery_list(%L)', apid)) = '42501', 'list refused for ' || i;
    assert pg_temp.fails_with(format('select gallery_add_photo(%L, %L, null)', apid,
      coalesce(case when i = 1 then bob end, alice) || '/e.jpg')) = '42501', 'add refused for ' || i;
    assert pg_temp.fails_with(format('select gallery_delete_photo(%L, %L)', apid, p1)) = '42501', 'delete refused for ' || i;
  end loop;

  -- Bob's own gallery is separate, and he can't delete Alice's photo through his own profile.
  perform pg_temp.act_as(bob);
  assert gallery_list(bpid) = '[]'::jsonb, 'bob sees only his own (none)';
  assert pg_temp.fails_with(format('select gallery_delete_photo(%L, %L)', bpid, p1)) = 'P0002', 'other profile''s photo is not found';
  perform gallery_add_photo(bpid, bob || '/b.jpg', null);
  assert jsonb_array_length(gallery_list(bpid)) = 1, 'bob saved one';

  -- Alice deletes a photo: she gets the path back, and it's gone from the list.
  perform pg_temp.act_as(alice);
  path := gallery_delete_photo(apid, p1);
  assert path = alice || '/one.jpg', 'delete returns the storage path';
  assert jsonb_array_length(gallery_list(apid)) = 4, 'one fewer';
  assert not exists (select 1 from jsonb_array_elements(gallery_list(apid)) e where e ->> 'id' = p1::text), 'deleted photo not listed';
  assert pg_temp.fails_with(format('select gallery_delete_photo(%L, %L)', apid, p1)) = 'P0002', 'deleting twice';

  -- Deleting the account removes its photos, and nobody else's.
  perform migo_delete_account(apid);
  assert not exists (select 1 from photos where profile_id = apid), 'photos go with the account';
  assert exists (select 1 from photos where profile_id = bpid), 'bob''s photo stays';

  raise notice 'All gallery checks passed';
end;
$$;

rollback;
