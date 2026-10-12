insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('organization-assets', 'organization-assets', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Organization members can view organization logos" on storage.objects;
create policy "Organization members can view organization logos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'organization-assets'
    and (storage.foldername(name))[1] = 'organizations'
    and exists (
      select 1
      from public.organization_members
      where organization_members.organization_id = ((storage.foldername(name))[2])::uuid
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
  );

drop policy if exists "Organization admins can upload organization logos" on storage.objects;
create policy "Organization admins can upload organization logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'organization-assets'
    and (storage.foldername(name))[1] = 'organizations'
    and public.is_organization_admin(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Organization admins can update organization logos" on storage.objects;
create policy "Organization admins can update organization logos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'organization-assets'
    and (storage.foldername(name))[1] = 'organizations'
    and public.is_organization_admin(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'organization-assets'
    and (storage.foldername(name))[1] = 'organizations'
    and public.is_organization_admin(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Organization admins can delete organization logos" on storage.objects;
create policy "Organization admins can delete organization logos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'organization-assets'
    and (storage.foldername(name))[1] = 'organizations'
    and public.is_organization_admin(((storage.foldername(name))[2])::uuid)
  );
