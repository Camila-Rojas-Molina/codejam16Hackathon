-- 015_match_album.sql: a shared photo album in each match's conversation.
-- Run after 006_gallery.sql, 007_landmarks_geofencing.sql and 013_connections.sql. Safe to run again.
--
-- How it works
--   * Photos stay in their owner's private gallery (006). Sharing one into a match only records that
--     it's in the album of that PAIR of people; nothing is copied.
--   * The album belongs to the pair, not to one connection row, so if two people are removed and
--     match again later, their album comes back (like their messages).
--   * Only while the two are matched (an 'accepted' connection) can either of them see the album,
--     add their own photos to it, or open the other person's shared photos. Removing the match hides
--     the album for both; nothing is deleted.
--   * Each person can take back only the photos they shared. Deleting a photo from your gallery
--     also removes it from every album (on delete cascade).
--   * The gallery bucket stays private: a storage policy lets a matched partner create signed URLs
--     ONLY for photos shared into their album (checked by match_album_can_read, below).
--
-- Errors: 42501 not signed in / not your photo; P0002 not matched with that person / unknown photo.

create table if not exists match_album (
  -- The pair, stored in a fixed order so (A, B) and (B, A) are the same album.
  person_lo   uuid not null references profiles(id) on delete cascade,
  person_hi   uuid not null references profiles(id) on delete cascade,
  photo_id    uuid not null references photos(id) on delete cascade,
  shared_by   uuid not null references profiles(id) on delete cascade,
  shared_at   timestamptz not null default now(),
  primary key (person_lo, person_hi, photo_id),
  check (person_lo < person_hi)
);
create index if not exists match_album_photo_idx on match_album (photo_id);

alter table match_album enable row level security;
revoke all on match_album from anon, authenticated;

-- Is the caller (me) currently matched with p_other?
create or replace function match_album_matched(p_me uuid, p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from connections c
     where c.status = 'accepted'
       and ((c.requester_id = p_me and c.recipient_id = p_other)
         or (c.requester_id = p_other and c.recipient_id = p_me)))
$$;

-- The caller's profile, or an error if they aren't matched with p_person.
create or replace function match_album_pair(p_person uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := migo_me();
begin
  if p_person is null or p_person = me or not match_album_matched(me, p_person) then
    raise exception 'You can only share photos with someone you’re matched with' using errcode = 'P0002';
  end if;
  return me;
end;
$$;

-- The album with p_person, newest first. Each item is the photo (same shape as gallery_list) plus
-- shared_by_me and shared_at.
create or replace function match_album_list(p_person uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := match_album_pair(p_person);
begin
  return coalesce((
    select jsonb_agg(gallery_photo_json(p) || jsonb_build_object('shared_by_me', a.shared_by = me, 'shared_at', a.shared_at)
                     order by a.shared_at desc, p.id)
      from match_album a
      join photos p on p.id = a.photo_id
     where a.person_lo = least(me, p_person) and a.person_hi = greatest(me, p_person)
  ), '[]'::jsonb);
end;
$$;

-- Shares one of the caller's own photos into the album with p_person. Sharing twice is harmless.
create or replace function match_album_add(p_person uuid, p_photo uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := match_album_pair(p_person);
begin
  if not exists (select 1 from photos where id = p_photo and profile_id = me) then
    raise exception 'You can only share your own photos' using errcode = '42501';
  end if;
  insert into match_album (person_lo, person_hi, photo_id, shared_by)
  values (least(me, p_person), greatest(me, p_person), p_photo, me)
  on conflict (person_lo, person_hi, photo_id) do nothing;
  return match_album_list(p_person);
end;
$$;

-- Takes a photo the caller shared back out of the album (it stays in their gallery).
create or replace function match_album_remove(p_person uuid, p_photo uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := match_album_pair(p_person);
begin
  delete from match_album
   where person_lo = least(me, p_person) and person_hi = greatest(me, p_person)
     and photo_id = p_photo and shared_by = me;
  if not found then
    raise exception 'You can only remove photos you shared' using errcode = '42501';
  end if;
  return match_album_list(p_person);
end;
$$;

-- For the storage policy: may the signed-in caller read this gallery file? True when the file is a
-- photo shared into an album with someone the caller is currently matched with. (The owner's own
-- folder is covered by 006's "read own folder" policy.)
create or replace function match_album_can_read(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from photos p
      join match_album a on a.photo_id = p.id
      join profiles me on me.auth_user_id = auth.uid()
     where p.storage_path = p_path
       and me.id in (a.person_lo, a.person_hi)
       and me.id <> p.profile_id
       and match_album_matched(me.id, p.profile_id))
$$;

revoke execute on function match_album_matched(uuid, uuid) from public, anon, authenticated;
revoke execute on function match_album_pair(uuid) from public, anon, authenticated;
revoke execute on function match_album_list(uuid) from public, anon;
revoke execute on function match_album_add(uuid, uuid) from public, anon;
revoke execute on function match_album_remove(uuid, uuid) from public, anon;
revoke execute on function match_album_can_read(text) from public, anon;
grant execute on function match_album_list(uuid) to authenticated;
grant execute on function match_album_add(uuid, uuid) to authenticated;
grant execute on function match_album_remove(uuid, uuid) to authenticated;
-- Storage evaluates policies as the signed-in user, so they need to be able to call the check.
grant execute on function match_album_can_read(text) to authenticated;

-- Storage policy (Supabase only; skipped on a plain Postgres without the storage schema).
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage schema not found: skipped the match album storage policy (fine for local tests)';
    return;
  end if;
  execute 'drop policy if exists "gallery: read photos shared with your match" on storage.objects';
  execute $q$
    create policy "gallery: read photos shared with your match" on storage.objects
      for select to authenticated
      using (bucket_id = 'gallery' and public.match_album_can_read(name))
  $q$;
end;
$$;
