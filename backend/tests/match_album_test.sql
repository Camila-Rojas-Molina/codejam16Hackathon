-- Checks the shared match album (015_match_album.sql). Rolls back.
begin;
do $$
declare
  ua uuid := '0aaaaaaa-0000-4000-8000-0000000000a1'; -- auth users
  ub uuid := '0aaaaaaa-0000-4000-8000-0000000000b1';
  uc uuid := '0aaaaaaa-0000-4000-8000-0000000000c1';
  pa uuid; pb uuid; pc uuid;                         -- their profiles
  photo_a uuid; photo_b uuid; photo_c uuid;
  conn uuid;
  album jsonb;
  denied boolean;
begin
  insert into auth.users (id, email) values (ua, 'a@x.co'), (ub, 'b@x.co'), (uc, 'c@x.co');
  insert into profiles (name, avatar, role, auth_user_id) values ('Ana', 'star', 'tourist', ua) returning id into pa;
  insert into profiles (name, avatar, role, auth_user_id) values ('Ben', 'star', 'local', ub) returning id into pb;
  insert into profiles (name, avatar, role, auth_user_id) values ('Cal', 'star', 'local', uc) returning id into pc;
  insert into photos (profile_id, storage_path) values (pa, ua || '/a.jpg') returning id into photo_a;
  insert into photos (profile_id, storage_path) values (pb, ub || '/b.jpg') returning id into photo_b;
  insert into photos (profile_id, storage_path) values (pc, uc || '/c.jpg') returning id into photo_c;
  insert into connections (requester_id, recipient_id, status) values (pa, pb, 'accepted') returning id into conn;

  -- Ana shares her photo with Ben; sharing twice is harmless.
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  perform match_album_add(pb, photo_a);
  album := match_album_add(pb, photo_a);
  if jsonb_array_length(album) <> 1 or not (album -> 0 ->> 'shared_by_me')::boolean then raise exception 'Ana should see her one shared photo'; end if;

  -- Ana can't share someone else's photo.
  denied := false;
  begin perform match_album_add(pb, photo_b); exception when sqlstate '42501' then denied := true; end;
  if not denied then raise exception 'sharing another person''s photo should be refused'; end if;

  -- Ana isn't matched with Cal: no album.
  denied := false;
  begin perform match_album_list(pc); exception when sqlstate 'P0002' then denied := true; end;
  if not denied then raise exception 'an unmatched person should have no album'; end if;

  -- Ben sees Ana's photo, adds his own, and may read Ana's file; Ana's own folder rule covers hers.
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  album := match_album_add(pa, photo_b);
  if jsonb_array_length(album) <> 2 then raise exception 'Ben should see both photos'; end if;
  if not match_album_can_read(ua || '/a.jpg') then raise exception 'Ben should be able to open Ana''s shared photo'; end if;
  if match_album_can_read(uc || '/c.jpg') then raise exception 'Ben must not open Cal''s photo'; end if;

  -- Ben can't take Ana's photo out of the album.
  denied := false;
  begin perform match_album_remove(pa, photo_a); exception when sqlstate '42501' then denied := true; end;
  if not denied then raise exception 'only the sharer may remove a photo'; end if;

  -- Cal (not in the album) can't read Ana's file.
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  if match_album_can_read(ua || '/a.jpg') then raise exception 'Cal must not open Ana''s photo'; end if;

  -- Match removed: the album is hidden and files can't be opened; matching again brings it back.
  update connections set status = 'removed' where id = conn;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  if match_album_can_read(ua || '/a.jpg') then raise exception 'after removal the photo must not be readable'; end if;
  denied := false;
  begin perform match_album_list(pa); exception when sqlstate 'P0002' then denied := true; end;
  if not denied then raise exception 'after removal the album should be hidden'; end if;
  insert into connections (requester_id, recipient_id, status) values (pa, pb, 'accepted');
  if jsonb_array_length(match_album_list(pa)) <> 2 then raise exception 'matching again should bring the album back'; end if;

  -- Ben takes his photo back; Ana deleting hers from her gallery removes it from the album.
  album := match_album_remove(pa, photo_b);
  if jsonb_array_length(album) <> 1 then raise exception 'Ben''s photo should be gone from the album'; end if;
  if not exists (select 1 from photos where id = photo_b) then raise exception 'removing from the album must keep the photo in the gallery'; end if;
  delete from photos where id = photo_a;
  if jsonb_array_length(match_album_list(pa)) <> 0 then raise exception 'a deleted photo should leave the album'; end if;

  -- Not signed in: refused.
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  denied := false;
  begin perform match_album_list(pa); exception when others then denied := true; end;
  if not denied then raise exception 'signed-out callers must be refused'; end if;

  raise notice 'All match album checks passed';
end $$;
rollback;
