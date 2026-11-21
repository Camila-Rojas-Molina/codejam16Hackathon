-- Selfie storage. Supabase only (uses the storage schema), so it isn't part of the local test.
-- Selfies are uploaded to selfies/<team_id>/<hunt_id>.jpg, and that path is passed to submit_selfie.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('selfies', 'selfies', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "anyone can upload a selfie" on storage.objects;
create policy "anyone can upload a selfie" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'selfies');

drop policy if exists "selfies are public" on storage.objects;
create policy "selfies are public" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'selfies');
