-- Role management is governed by the same granular permission used by member assignment.
-- Keep the legacy admin helper only for compatibility with older organization data.

drop policy if exists "Organization admins can create roles" on public.organization_roles;
create policy "Members with role management permission can create roles"
  on public.organization_roles for insert to authenticated
  with check (
    public.has_organization_permission(organization_id, 'organization.edit_user_roles')
    and created_by = auth.uid()
    and is_system = false
  );

drop policy if exists "Organization admins can update roles" on public.organization_roles;
create policy "Members with role management permission can update roles"
  on public.organization_roles for update to authenticated
  using (public.has_organization_permission(organization_id, 'organization.edit_user_roles') and is_system = false)
  with check (public.has_organization_permission(organization_id, 'organization.edit_user_roles') and is_system = false);

drop policy if exists "Organization admins can delete roles" on public.organization_roles;
create policy "Members with role management permission can delete roles"
  on public.organization_roles for delete to authenticated
  using (public.has_organization_permission(organization_id, 'organization.edit_user_roles') and is_system = false);

drop policy if exists "Organization admins can create role permissions" on public.organization_role_permissions;
create policy "Members with role management permission can create role permissions"
  on public.organization_role_permissions for insert to authenticated
  with check (exists (
    select 1
    from public.organization_roles
    where organization_roles.id = organization_role_permissions.role_id
      and public.has_organization_permission(organization_roles.organization_id, 'organization.edit_user_roles')
      and organization_roles.is_system = false
  ));

drop policy if exists "Organization admins can update role permissions" on public.organization_role_permissions;
create policy "Members with role management permission can update role permissions"
  on public.organization_role_permissions for update to authenticated
  using (exists (
    select 1
    from public.organization_roles
    where organization_roles.id = organization_role_permissions.role_id
      and public.has_organization_permission(organization_roles.organization_id, 'organization.edit_user_roles')
      and organization_roles.is_system = false
  ))
  with check (exists (
    select 1
    from public.organization_roles
    where organization_roles.id = organization_role_permissions.role_id
      and public.has_organization_permission(organization_roles.organization_id, 'organization.edit_user_roles')
      and organization_roles.is_system = false
  ));

drop policy if exists "Organization admins can delete role permissions" on public.organization_role_permissions;
create policy "Members with role management permission can delete role permissions"
  on public.organization_role_permissions for delete to authenticated
  using (exists (
    select 1
    from public.organization_roles
    where organization_roles.id = organization_role_permissions.role_id
      and public.has_organization_permission(organization_roles.organization_id, 'organization.edit_user_roles')
      and organization_roles.is_system = false
  ));

create or replace function public.delete_custom_organization_role(
  target_role_id uuid,
  replacement_role_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
begin
  select organization_id into target_organization_id
  from public.organization_roles
  where id = target_role_id and is_system = false;

  if target_organization_id is null then
    raise exception 'Only custom organization roles can be deleted';
  end if;
  if not public.has_organization_permission(target_organization_id, 'organization.edit_user_roles') then
    raise exception 'You do not have permission to manage organization roles';
  end if;
  if not exists (
    select 1 from public.organization_roles
    where id = replacement_role_id and organization_id = target_organization_id and replacement_role_id <> target_role_id
  ) then
    raise exception 'Replacement role must belong to the same organization';
  end if;

  update public.organization_members
  set role_id = replacement_role_id,
      role = case when exists (select 1 from public.organization_roles where id = replacement_role_id and system_key = 'organization_admin') then 'admin' else 'member' end,
      updated_by = auth.uid()
  where organization_id = target_organization_id and role_id = target_role_id;

  delete from public.organization_roles where id = target_role_id;
end;
$$;
