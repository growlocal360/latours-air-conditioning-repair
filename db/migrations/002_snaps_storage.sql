-- Job Snaps storage bucket: mirror source images so we own the asset URLs.
-- Run once against the Supabase project after the 001 migration.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'snaps',
  'snaps',
  true,
  20971520, -- 20 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public can read all objects in the snaps bucket.
drop policy if exists "snaps_public_read" on storage.objects;
create policy "snaps_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'snaps');

-- Authenticated role can write/update/delete. service_role bypasses RLS so
-- the webhook handler doesn't strictly need these — they exist so an
-- authenticated dashboard user could manage objects in the future.
drop policy if exists "snaps_authenticated_insert" on storage.objects;
create policy "snaps_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'snaps');

drop policy if exists "snaps_authenticated_update" on storage.objects;
create policy "snaps_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'snaps');

drop policy if exists "snaps_authenticated_delete" on storage.objects;
create policy "snaps_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'snaps');
