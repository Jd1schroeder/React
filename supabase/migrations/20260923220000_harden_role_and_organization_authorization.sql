-- Keep role assignments organization-scoped and make database authorization
-- enforce organization suspension independently of the client access gate.

do $$
begin
  if exists (
    select 1
    from public.organization_members members
    left join public.organization_roles roles on roles.id = members.role_id
    where members.role_id is not null
      and (roles.id is null or roles.organization_id <> members.organization_id)
  ) then
    raise exception 'Existing membership role assignments cross organization boundaries';
  end if;

  if exists (
    select 1
    from public.organization_invitations invitations
    left join public.organization_roles roles on roles.id = invitations.role_id
    where invitations.role_id is not null
      and (roles.id is null or roles.organization_id <> invitations.organization_id)
  ) then
    raise exception 'Existing invitation role assignments cross organization boundaries';
  end if;
end;
$$;

update public.organization_invitations invitations
set role_id = roles.id
from public.organization_roles roles
where invitations.role_id is null
  and roles.organization_id = invitations.organization_id
  and roles.is_system = true
  and roles.system_key = case when invitations.role = 'admin' then 'organization_admin' else 'requester' end;

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

drop trigger if exists validate_organization_membership_role on public.organization_members;
create trigger validate_organization_membership_role
before insert or update on public.organization_members
for each row execute function public.validate_organization_membership_role();

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members members
    join public.organization_roles roles on roles.id = members.role_id
      and roles.organization_id = members.organization_id
      and roles.system_key = 'organization_admin'
    where members.organization_id = target_organization_id
      and members.user_id = auth.uid()
      and members.status = 'active'
  );
$$;

create or replace function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members members
    join public.organization_roles roles on roles.id = members.role_id
      and roles.organization_id = members.organization_id
      and roles.system_key = 'organization_admin'
    where members.organization_id = target_organization_id
      and members.user_id = auth.uid()
      and members.role = 'owner'
      and members.status = 'active'
  );
$$;

revoke execute on function public.is_organization_admin(uuid) from public;
grant execute on function public.is_organization_admin(uuid) to authenticated;
revoke execute on function public.is_organization_owner(uuid) from public;
grant execute on function public.is_organization_owner(uuid) to authenticated;

create or replace function public.has_organization_permission(
  target_organization_id uuid,
  target_permission_key text,
  required_scope text default 'any'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members members
    join public.organizations organizations on organizations.id = members.organization_id
      and organizations.status = 'active'
    join public.organization_role_permissions grants on grants.role_id = members.role_id
    where members.organization_id = target_organization_id
      and members.user_id = auth.uid()
      and members.status = 'active'
      and grants.permission_key = target_permission_key
      and (grants.scope = 'any' or grants.scope = required_scope)
  );
$$;

create or replace function public.has_organization_record_permission(
  target_organization_id uuid,
  target_permission_key text,
  record_owner_id uuid default null,
  record_assignee_id uuid default null,
  is_team_record boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members members
    join public.organizations organizations on organizations.id = members.organization_id
      and organizations.status = 'active'
    join public.organization_role_permissions grants on grants.role_id = members.role_id
    where members.organization_id = target_organization_id
      and members.user_id = auth.uid()
      and members.status = 'active'
      and grants.permission_key = target_permission_key
      and (
        grants.scope = 'any'
        or (grants.scope = 'own' and record_owner_id = auth.uid())
        or (grants.scope = 'assigned' and record_assignee_id = auth.uid())
        or (grants.scope = 'team' and is_team_record)
      )
  );
$$;

revoke execute on function public.has_organization_permission(uuid, text, text) from public;
grant execute on function public.has_organization_permission(uuid, text, text) to authenticated;
revoke execute on function public.has_organization_record_permission(uuid, text, uuid, uuid, boolean) from public;
grant execute on function public.has_organization_record_permission(uuid, text, uuid, uuid, boolean) to authenticated;

drop policy if exists "Organization admins can add members" on public.organization_members;
create policy "Organization admins can add members"
  on public.organization_members for insert to authenticated
  with check (
    public.has_organization_permission(organization_id, 'organization.invite_users')
    and status = 'invited'
    and invited_by = auth.uid()
    and role_id is not null
  );

drop policy if exists "Organization admins can update members" on public.organization_members;
create policy "Organization admins can update members"
  on public.organization_members for update to authenticated
  using (public.has_organization_permission(organization_id, 'organization.edit_user_roles'))
  with check (
    public.has_organization_permission(organization_id, 'organization.edit_user_roles')
    and (role_id is null or exists (
      select 1
      from public.organization_roles roles
      where roles.id = organization_members.role_id
        and roles.organization_id = organization_members.organization_id
    ))
  );

drop policy if exists "Organization admins can create invitations" on public.organization_invitations;
create policy "Organization admins can create invitations"
  on public.organization_invitations for insert to authenticated
  with check (
    public.has_organization_permission(organization_id, 'organization.invite_users')
    and invited_by = auth.uid()
    and role_id is not null
    and exists (
      select 1
      from public.organization_roles roles
      where roles.id = organization_invitations.role_id
        and roles.organization_id = organization_invitations.organization_id
    )
  );

drop policy if exists "Organization admins can update invitations" on public.organization_invitations;
create policy "Organization admins can update invitations"
  on public.organization_invitations for update to authenticated
  using (public.has_organization_permission(organization_id, 'organization.invite_users'))
  with check (
    public.has_organization_permission(organization_id, 'organization.invite_users')
    and role_id is not null
    and exists (
      select 1
      from public.organization_roles roles
      where roles.id = organization_invitations.role_id
        and roles.organization_id = organization_invitations.organization_id
    )
  );

create or replace function public.validate_organization_invitation_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role_id is null or not exists (
    select 1
    from public.organization_roles roles
    where roles.id = new.role_id
      and roles.organization_id = new.organization_id
  ) then
    raise exception 'Invitation role must belong to the invitation organization';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_organization_invitation_role on public.organization_invitations;
create trigger validate_organization_invitation_role
before insert or update on public.organization_invitations
for each row execute function public.validate_organization_invitation_role();

-- Make the invitation RPC fail closed if an old row predates normalized role IDs.
create or replace function public.accept_organization_invitation(raw_token text)
returns public.organization_members
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.organization_invitations;
  accepted_membership public.organization_members;
  current_email text;
  current_phone text;
  assigned_role text;
begin
  if auth.uid() is null then raise exception 'You must be signed in to accept an invitation'; end if;
  select email, phone into current_email, current_phone from auth.users where id = auth.uid();
  select * into invitation from public.organization_invitations
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex') and status = 'invited' and expires_at > now()
    and ((contact_type = 'email' and lower(contact_value) = lower(coalesce(current_email, ''))) or (contact_type = 'phone' and contact_value = coalesce(current_phone, '')))
  for update;
  if not found then raise exception 'This invitation is invalid, expired, or does not match the signed-in user'; end if;

  select case when roles.system_key = 'organization_admin' then 'admin' else 'member' end
    into assigned_role
  from public.organization_roles roles
  where roles.id = invitation.role_id
    and roles.organization_id = invitation.organization_id;
  if assigned_role is null then raise exception 'This invitation has an invalid organization role'; end if;

  insert into public.organization_members (organization_id, user_id, role, role_id, status, invited_by, invited_at, joined_at)
  values (invitation.organization_id, auth.uid(), assigned_role, invitation.role_id, 'active', invitation.invited_by, invitation.invited_at, now())
  on conflict (organization_id, user_id) do update set role = excluded.role, role_id = excluded.role_id, status = 'active', invited_by = excluded.invited_by, invited_at = excluded.invited_at, joined_at = coalesce(public.organization_members.joined_at, excluded.joined_at);
  update public.organization_invitations set status = 'accepted', accepted_by = auth.uid(), accepted_at = now() where id = invitation.id;
  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata) values (invitation.organization_id, auth.uid(), 'accepted', 'organization_invitation', invitation.id, jsonb_build_object('role_id', invitation.role_id));
  select * into accepted_membership from public.organization_members where organization_id = invitation.organization_id and user_id = auth.uid();
  return accepted_membership;
end;
$$;

revoke execute on function public.accept_organization_invitation(text) from public;
grant execute on function public.accept_organization_invitation(text) to authenticated;

select 'role and organization authorization hardening installed' as result;
