insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can view their avatar" on storage.objects;
create policy "Users can view their avatar"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their avatar" on storage.objects;
create policy "Users can upload their avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their avatar" on storage.objects;
create policy "Users can update their avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their avatar" on storage.objects;
create policy "Users can delete their avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
