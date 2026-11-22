-- Gallery: photos people take while exploring. Run after 005. Safe to run again.
--
--   * The image file lives in the 'gallery' storage bucket at gallery/<auth uid>/<random id>.jpg.
--     The browser uploads it with the user's access token, then calls gallery_add_photo() with that
--     path and what we know about it (city, caption, quest/hunt, when it was taken, size).
--   * `photos` holds one row per picture. Private to its owner: the browser can't read or write the
--     table directly, only through the gallery_* functions below, which apply the owner rule from
--     005_auth.sql (migo_assert_owner).
--   * Saving a photo needs a login, and the profile must belong to that login (profiles made without
--     a login can't have photos, because the files are filed under the login's id).
--   * The bucket is public-read, like 'selfies': anyone with a photo's URL can view it. File names
--     are random, so URLs can't be guessed, but don't treat them as secret.
--   * The storage part (bucket + policies) only runs where Supabase's `storage` schema exists, so
--     this file also runs on a plain local Postgres for the tests.
--
-- Known gap: deleting a photo row (or the whole account) doesn't delete the file by itself.
-- gallery_delete_photo() returns the file's path so the app deletes it through the Storage API;
-- files of a deleted account stay in the bucket until cleaned up from the dashboard.

create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  -- <auth uid>/<name>.<ext> inside the 'gallery' bucket.
  storage_path  text not null unique check (char_length(storage_path) <= 200),
  city_name     text check (char_length(city_name) <= 120),
  country       text check (char_length(country) <= 120),
  country_code  text check (country_code ~ '^[A-Z]{2}$'),
  lat           double precision check (lat between -90 and 90),
  lng           double precision check (lng between -180 and 180),
  -- PlacePick.placeId from the app's city search, e.g. 'geonames:2267057'.
  place_id      text check (char_length(place_id) <= 120),
  caption       text check (char_length(caption) <= 200),
  quest_id      text check (char_length(quest_id) <= 120),
  hunt_id       text check (char_length(hunt_id) <= 120),
  taken_at      timestamptz not null default now(),
  width         integer check (width between 1 and 20000),
  height        integer check (height between 1 and 20000),
  created_at    timestamptz not null default now()
);
create index if not exists photos_profile_taken_idx on photos (profile_id, taken_at desc, created_at desc);

alter table photos enable row level security;
revoke all on photos from anon, authenticated;

-- ---------------------------------------------------------------------------
-- API functions
-- ---------------------------------------------------------------------------

create or replace function gallery_photo_json(p photos) returns jsonb
language sql immutable as $$
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
    'created_at', p.created_at)
$$;

-- Records an uploaded photo. p_meta (all optional): city_name, country, country_code, lat, lng,
-- place_id, caption, quest_id, hunt_id, taken_at (ISO time, never later than now), width, height.
-- Errors: 42501 not signed in / not your account / not your folder; 22023 bad input;
-- 23505 path already saved; P0002 unknown profile. Returns the saved photo.
create or replace function gallery_add_photo(p_profile_id uuid, p_storage_path text, p_meta jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me       uuid := auth.uid();
  owner_id uuid;
  meta     jsonb := coalesce(p_meta, '{}'::jsonb);
  caption  text;
  code     text;
  taken    timestamptz;
  p        photos;
begin
  if me is null then
    raise exception 'Sign in to save photos' using errcode = '42501';
  end if;
  perform migo_assert_owner(p_profile_id);
  select auth_user_id into owner_id from profiles where id = p_profile_id;
  if not found then
    raise exception 'Unknown profile %', p_profile_id using errcode = 'P0002';
  end if;
  if owner_id is distinct from me then
    -- Unlinked (pre-login) profile: its photos couldn't be filed under a login.
    raise exception 'Not your account' using errcode = '42501';
  end if;

  if p_storage_path is null or position(me::text || '/' in p_storage_path) <> 1 then
    raise exception 'Photos must be stored in your own folder' using errcode = '42501';
  end if;
  if p_storage_path !~ ('^' || me::text || '/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp)$') then
    raise exception 'Invalid photo path' using errcode = '22023';
  end if;
  if jsonb_typeof(meta) is distinct from 'object' then
    raise exception 'Photo details must be a JSON object' using errcode = '22023';
  end if;

  caption := nullif(btrim(meta ->> 'caption'), '');
  if char_length(caption) > 200 then
    raise exception 'Caption is too long (200 characters max)' using errcode = '22023';
  end if;
  code := upper(nullif(btrim(meta ->> 'country_code'), ''));
  if code is not null and code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country code' using errcode = '22023';
  end if;

  begin
    taken := least(coalesce((meta ->> 'taken_at')::timestamptz, now()), now());
    insert into photos (profile_id, storage_path, city_name, country, country_code, lat, lng, place_id,
                        caption, quest_id, hunt_id, taken_at, width, height)
    values (p_profile_id, p_storage_path,
            nullif(btrim(meta ->> 'city_name'), ''),
            nullif(btrim(meta ->> 'country'), ''),
            code,
            (meta ->> 'lat')::double precision,
            (meta ->> 'lng')::double precision,
            nullif(btrim(meta ->> 'place_id'), ''),
            caption,
            nullif(btrim(meta ->> 'quest_id'), ''),
            nullif(btrim(meta ->> 'hunt_id'), ''),
            taken,
            (meta ->> 'width')::integer,
            (meta ->> 'height')::integer)
    returning * into p;
  exception
    when unique_violation then
      raise exception 'This photo is already saved' using errcode = '23505';
    when check_violation or invalid_text_representation or invalid_datetime_format
         or datetime_field_overflow or numeric_value_out_of_range then
      raise exception 'Invalid photo details: %', sqlerrm using errcode = '22023';
  end;
  return gallery_photo_json(p);
end;
$$;

-- The profile's photos, newest first (by when they were taken). Always a JSON array.
create or replace function gallery_list(p_profile_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform migo_assert_owner(p_profile_id);
  return coalesce(
    (select jsonb_agg(gallery_photo_json(p) order by p.taken_at desc, p.created_at desc, p.id)
       from photos p
      where p.profile_id = p_profile_id),
    '[]'::jsonb);
end;
$$;

-- Deletes one photo row and returns its storage path, so the app can delete the file too.
create or replace function gallery_delete_photo(p_profile_id uuid, p_photo_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  path text;
begin
  perform migo_assert_owner(p_profile_id);
  delete from photos where id = p_photo_id and profile_id = p_profile_id returning storage_path into path;
  if path is null then
    raise exception 'Photo not found' using errcode = 'P0002';
  end if;
  return path;
end;
$$;

revoke execute on function gallery_photo_json(photos) from public, anon, authenticated;
-- Supabase grants new functions to anon/authenticated by default, so revoke from them explicitly.
revoke execute on function gallery_add_photo(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function gallery_list(uuid) from public, anon, authenticated;
revoke execute on function gallery_delete_photo(uuid, uuid) from public, anon, authenticated;
grant execute on function gallery_add_photo(uuid, text, jsonb) to authenticated;
grant execute on function gallery_list(uuid) to anon, authenticated;
grant execute on function gallery_delete_photo(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: the 'gallery' bucket (Supabase only; skipped where there's no storage schema)
-- ---------------------------------------------------------------------------
-- Public read (public URLs: /storage/v1/object/public/gallery/<path>), 8 MB, JPEG/PNG/WebP.
-- A signed-in user may upload, replace, list and delete files only in their own folder <auth uid>/.
-- (The Storage API needs SELECT as well as DELETE to remove a file.)

do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'No storage schema here: skipped the gallery bucket (fine for local tests)';
    return;
  end if;

  execute $q$
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('gallery', 'gallery', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types
  $q$;

  execute 'drop policy if exists "gallery: upload to own folder" on storage.objects';
  execute $q$
    create policy "gallery: upload to own folder" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text)
  $q$;

  execute 'drop policy if exists "gallery: read own folder" on storage.objects';
  execute $q$
    create policy "gallery: read own folder" on storage.objects
      for select to authenticated
      using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text)
  $q$;

  execute 'drop policy if exists "gallery: replace in own folder" on storage.objects';
  execute $q$
    create policy "gallery: replace in own folder" on storage.objects
      for update to authenticated
      using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text)
  $q$;

  execute 'drop policy if exists "gallery: delete from own folder" on storage.objects';
  execute $q$
    create policy "gallery: delete from own folder" on storage.objects
      for delete to authenticated
      using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text)
  $q$;
end;
$$;
