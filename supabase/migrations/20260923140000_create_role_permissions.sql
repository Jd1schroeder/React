create table if not exists public.organization_role_permissions (
  role_id uuid not null references public.organization_roles(id) on delete cascade,
  permission_key text not null check (char_length(btrim(permission_key)) between 1 and 120),
  scope text not null check (scope in ('own', 'assigned', 'team', 'any')),
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create index if not exists organization_role_permissions_role_idx
  on public.organization_role_permissions(role_id);

alter table public.organization_role_permissions enable row level security;

drop policy if exists "Members can view role permissions" on public.organization_role_permissions;
create policy "Members can view role permissions"
  on public.organization_role_permissions for select to authenticated
  using (exists (
    select 1
    from public.organization_roles
    join public.organization_members on organization_members.organization_id = organization_roles.organization_id
    where organization_roles.id = organization_role_permissions.role_id
      and organization_members.user_id = auth.uid()
      and organization_members.status = 'active'
  ));

drop policy if exists "Organization admins can create role permissions" on public.organization_role_permissions;
create policy "Organization admins can create role permissions"
  on public.organization_role_permissions for insert to authenticated
  with check (exists (
    select 1 from public.organization_roles
    where organization_roles.id = organization_role_permissions.role_id
      and public.is_organization_admin(organization_roles.organization_id)
      and organization_roles.is_system = false
  ));

drop policy if exists "Organization admins can update role permissions" on public.organization_role_permissions;
create policy "Organization admins can update role permissions"
  on public.organization_role_permissions for update to authenticated
  using (exists (
    select 1 from public.organization_roles
    where organization_roles.id = organization_role_permissions.role_id
      and public.is_organization_admin(organization_roles.organization_id)
      and organization_roles.is_system = false
  ))
  with check (exists (
    select 1 from public.organization_roles
    where organization_roles.id = organization_role_permissions.role_id
      and public.is_organization_admin(organization_roles.organization_id)
      and organization_roles.is_system = false
  ));

drop policy if exists "Organization admins can delete role permissions" on public.organization_role_permissions;
create policy "Organization admins can delete role permissions"
  on public.organization_role_permissions for delete to authenticated
  using (exists (
    select 1 from public.organization_roles
    where organization_roles.id = organization_role_permissions.role_id
      and public.is_organization_admin(organization_roles.organization_id)
      and organization_roles.is_system = false
  ));
