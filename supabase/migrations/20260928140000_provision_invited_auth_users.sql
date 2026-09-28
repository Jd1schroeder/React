-- Provision email invitees as unconfirmed Auth users so administrators can
-- manage their pending membership before the invite is accepted.

alter table public.organization_invitations
  add column if not exists invited_user_id uuid references auth.users(id) on delete set null;

create index if not exists organization_invitations_invited_user_idx
  on public.organization_invitations(organization_id, invited_user_id)
  where invited_user_id is not null;

create unique index if not exists organization_invitations_pending_user_idx
  on public.organization_invitations(organization_id, invited_user_id)
  where invited_user_id is not null and status = 'invited';

create or replace function public.complete_organization_invitation(target_invitation_id uuid)
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
  if auth.uid() is null then
    raise exception 'You must be signed in to accept an invitation';
  end if;

  select email, phone into current_email, current_phone
  from auth.users
  where id = auth.uid();

  select * into invitation
  from public.organization_invitations
  where id = target_invitation_id
    and status = 'invited'
    and expires_at > now()
    and (invited_user_id is null or invited_user_id = auth.uid())
    and (
      (contact_type = 'email' and lower(contact_value) = lower(coalesce(current_email, '')))
      or (contact_type = 'phone' and contact_value = coalesce(current_phone, ''))
    )
  for update;

  if not found then
    raise exception 'This invitation is invalid, expired, or does not match the signed-in user';
  end if;

  select case when roles.system_key = 'organization_admin' then 'admin' else 'member' end
    into assigned_role
  from public.organization_roles roles
  where roles.id = invitation.role_id
    and roles.organization_id = invitation.organization_id;

  if assigned_role is null then
    raise exception 'This invitation has an invalid organization role';
  end if;

  insert into public.organization_members (
    organization_id, user_id, role, role_id, status, invited_by, invited_at, joined_at
  ) values (
    invitation.organization_id, auth.uid(), assigned_role, invitation.role_id,
    'active', invitation.invited_by, invitation.invited_at, now()
  )
  on conflict (organization_id, user_id) do update
    set role = excluded.role,
        role_id = excluded.role_id,
        status = 'active',
        invited_by = excluded.invited_by,
        invited_at = excluded.invited_at,
        joined_at = coalesce(public.organization_members.joined_at, excluded.joined_at);

  update public.organization_invitations
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = invitation.id;

  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    invitation.organization_id, auth.uid(), 'accepted', 'organization_invitation', invitation.id,
    jsonb_build_object('role_id', invitation.role_id)
  );

  select * into accepted_membership
  from public.organization_members
  where organization_id = invitation.organization_id and user_id = auth.uid();
  return accepted_membership;
end;
$$;

create or replace function public.accept_organization_invitation(raw_token text)
returns public.organization_members
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invitation_id uuid;
begin
  select id into target_invitation_id
  from public.organization_invitations
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex')
    and status = 'invited'
    and expires_at > now();

  if target_invitation_id is null then
    raise exception 'This invitation is invalid or expired';
  end if;

  return public.complete_organization_invitation(target_invitation_id);
end;
$$;

create or replace function public.accept_organization_invitation_for_current_user()
returns public.organization_members
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invitation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept an invitation';
  end if;

  select id into target_invitation_id
  from public.organization_invitations
  where invited_user_id = auth.uid()
    and status = 'invited'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if target_invitation_id is null then
    raise exception 'No pending invitation was found for this account';
  end if;

  return public.complete_organization_invitation(target_invitation_id);
end;
$$;

create or replace function public.update_pending_organization_invitation_role(
  target_invitation_id uuid,
  target_role_id uuid
)
returns public.organization_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.organization_invitations;
  role_system_key text;
begin
  select * into invitation
  from public.organization_invitations
  where id = target_invitation_id and status = 'invited'
  for update;

  if not found or not public.has_organization_permission(invitation.organization_id, 'organization.edit_user_roles') then
    raise exception 'You do not have permission to update this invitation';
  end if;

  select system_key into role_system_key
  from public.organization_roles
  where id = target_role_id and organization_id = invitation.organization_id;

  if role_system_key is null then
    raise exception 'Role must belong to the invitation organization';
  end if;

  update public.organization_invitations
  set role_id = target_role_id,
      role = case when role_system_key = 'organization_admin' then 'admin' else 'member' end
  where id = target_invitation_id
  returning * into invitation;

  if invitation.invited_user_id is not null then
    update public.organization_members
    set role_id = target_role_id,
        role = case when role_system_key = 'organization_admin' then 'admin' else 'member' end,
        updated_by = auth.uid()
    where organization_id = invitation.organization_id
      and user_id = invitation.invited_user_id
      and status = 'invited';
  end if;

  return invitation;
end;
$$;

revoke execute on function public.complete_organization_invitation(uuid) from public;
revoke execute on function public.accept_organization_invitation(text) from public;
revoke execute on function public.accept_organization_invitation_for_current_user() from public;
revoke execute on function public.update_pending_organization_invitation_role(uuid, uuid) from public;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.accept_organization_invitation_for_current_user() to authenticated;
grant execute on function public.update_pending_organization_invitation_role(uuid, uuid) to authenticated;

select 'provisioned invitation memberships installed' as result;
