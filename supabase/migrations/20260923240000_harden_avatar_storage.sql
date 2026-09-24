-- Keep avatar uploads private and enforce the upload envelope at the storage
-- service, not only through the browser's file input accept attribute.

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/gif', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']::text[]
where id = 'avatars';

drop policy if exists "Users can upload their avatar" on storage.objects;
create policy "Users can upload their avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata ->> 'mimetype') in ('image/gif', 'image/jpeg', 'image/png', 'image/heic', 'image/heif')
    and case
      when coalesce(metadata ->> 'size', '') ~ '^[0-9]+$'
        then (metadata ->> 'size')::bigint <= 5242880
      else false
    end
  );

drop policy if exists "Users can update their avatar" on storage.objects;
create policy "Users can update their avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (metadata ->> 'mimetype') in ('image/gif', 'image/jpeg', 'image/png', 'image/heic', 'image/heif')
    and case
      when coalesce(metadata ->> 'size', '') ~ '^[0-9]+$'
        then (metadata ->> 'size')::bigint <= 5242880
      else false
    end
  );

select 'avatar storage hardening installed' as result;
