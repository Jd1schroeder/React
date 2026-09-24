-- Suspended organizations must be inaccessible to organization administrators.
-- Platform recovery is intentionally separate from organization membership and
-- is read from server-managed auth app metadata only.

-- Reconcile the null-safe role validation correction from the already-applied
-- role hardening migration without editing or rerunning that migration.
create or replace function public.validate_organization_membership_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role_system_key text;
begin
  if tg_op = 'UPDATE'
    and old.user_id = auth.uid()
    and old.role_id is distinct from new.role_id then
    raise exception 'Users cannot change their own organization role';
  end if;

  if new.role_id is null then
    if new.status = 'active' and new.role in ('owner', 'admin') then
      raise exception 'Active owners and administrators must use a system organization role';
    end if;
    return new;
  end if;

  select system_key
    into assigned_role_system_key
  from public.organization_roles
  where id = new.role_id
    and organization_id = new.organization_id;

  if not found then
    raise exception 'Role must belong to the membership organization';
  end if;

  if new.role = 'owner' and assigned_role_system_key is distinct from 'organization_admin' then
    raise exception 'Owners must use the Organization Admin role';
  end if;

  if assigned_role_system_key = 'organization_admin' and new.role not in ('owner', 'admin') then
    raise exception 'Organization Admin memberships must use the admin compatibility role';
  end if;

  if assigned_role_system_key is distinct from 'organization_admin' and new.role <> 'member' then
    raise exception 'Non-administrator memberships must use the member compatibility role';
  end if;

  return new;
end;
$$;

create or replace function public.is_platform_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'superadmin';
$$;

revoke execute on function public.is_platform_superadmin() from public;
grant execute on function public.is_platform_superadmin() to authenticated;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_superadmin()
    or exists (
      select 1
      from public.organization_members members
      join public.organization_roles roles on roles.id = members.role_id
        and roles.organization_id = members.organization_id
        and roles.system_key = 'organization_admin'
      join public.organizations organizations on organizations.id = members.organization_id
        and organizations.status = 'active'
      where members.organization_id = target_organization_id
        and members.user_id = auth.uid()
        and members.status = 'active'
    );
$$;

revoke execute on function public.is_organization_admin(uuid) from public;
grant execute on function public.is_organization_admin(uuid) to authenticated;

create or replace function public.protect_organization_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.organization_id <> new.organization_id or old.user_id <> new.user_id then
      raise exception 'Membership organization and user cannot be changed';
    end if;

    if old.role = 'owner'
      and auth.uid() is not null
      and not public.is_platform_superadmin()
      and not public.is_organization_owner(old.organization_id) then
      raise exception 'Only an organization owner can change an owner membership';
    end if;

    if old.role = 'owner'
      and (new.role <> 'owner' or new.status <> 'active')
      and not exists (
        select 1
        from public.organization_members
        where organization_id = old.organization_id
          and user_id <> old.user_id
          and role = 'owner'
          and status = 'active'
      ) then
      raise exception 'An organization must retain an active owner';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE'
    and old.role = 'owner'
    and not exists (
      select 1
      from public.organization_members
      where organization_id = old.organization_id
        and user_id <> old.user_id
        and role = 'owner'
        and status = 'active'
    ) then
    raise exception 'An organization must retain an active owner';
  end if;

  return old;
end;
$$;

drop policy if exists "Members can view their organizations" on public.organizations;
create policy "Members can view their organizations"
  on public.organizations for select to authenticated
  using (
    public.is_platform_superadmin()
    or exists (
      select 1
      from public.organization_members
      where organization_members.organization_id = organizations.id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
  );

drop policy if exists "Organization admins can update their organization" on public.organizations;
create policy "Organization admins can update their organization"
  on public.organizations for update to authenticated
  using (public.is_organization_admin(id))
  with check (public.is_platform_superadmin() or (status = 'active' and public.is_organization_admin(id)));

drop policy if exists "Members can view organization membership" on public.organization_members;
create policy "Members can view organization membership"
  on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can add members" on public.organization_members;
create policy "Organization admins can add members"
  on public.organization_members for insert to authenticated
  with check (
    public.is_platform_superadmin()
    or (
      public.has_organization_permission(organization_id, 'organization.invite_users')
      and status = 'invited'
      and invited_by = auth.uid()
      and role_id is not null
    )
  );

drop policy if exists "Organization admins can update members" on public.organization_members;
create policy "Organization admins can update members"
  on public.organization_members for update to authenticated
  using (public.is_platform_superadmin() or public.has_organization_permission(organization_id, 'organization.edit_user_roles'))
  with check (
    public.is_platform_superadmin()
    or (
      public.has_organization_permission(organization_id, 'organization.edit_user_roles')
      and (role_id is null or exists (
        select 1
        from public.organization_roles roles
        where roles.id = organization_members.role_id
          and roles.organization_id = organization_members.organization_id
      ))
    )
  );

drop policy if exists "Organization admins can remove members" on public.organization_members;
create policy "Organization admins can remove members"
  on public.organization_members for delete to authenticated
  using (public.is_platform_superadmin() or public.has_organization_permission(organization_id, 'organization.remove_users'));

drop policy if exists "Organization admins can view member profiles" on public.profiles;
create policy "Organization admins can view member profiles"
  on public.profiles for select to authenticated
  using (
    public.is_platform_superadmin()
    or exists (
      select 1
      from public.organization_members
      where organization_members.user_id = profiles.id
        and public.is_organization_admin(organization_members.organization_id)
    )
  );

drop policy if exists "Organization admins can view invitations" on public.organization_invitations;
create policy "Organization admins can view invitations"
  on public.organization_invitations for select to authenticated
  using (public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can update invitations" on public.organization_invitations;
create policy "Organization admins can update invitations"
  on public.organization_invitations for update to authenticated
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can view audit events" on public.audit_events;
create policy "Organization admins can view audit events"
  on public.audit_events for select to authenticated
  using (public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can create audit events" on public.audit_events;
create policy "Organization admins can create audit events"
  on public.audit_events for insert to authenticated
  with check (public.is_organization_admin(organization_id) and actor_id = auth.uid());

select 'legacy organization authorization policies hardened' as result;
