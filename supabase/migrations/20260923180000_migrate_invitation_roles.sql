alter table public.organization_invitations
  add column if not exists role_id uuid references public.organization_roles(id) on delete set null;

update public.organization_invitations invitations
set role_id = roles.id
from public.organization_roles roles
where invitations.organization_id = roles.organization_id
  and roles.is_system = true
  and roles.system_key = case when invitations.role = 'admin' then 'organization_admin' else 'requester' end
  and invitations.role_id is null;

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
  select case when roles.system_key = 'organization_admin' then 'admin' else 'member' end into assigned_role
  from public.organization_roles roles where roles.id = invitation.role_id;
  insert into public.organization_members (organization_id, user_id, role, role_id, status, invited_by, invited_at, joined_at)
  values (invitation.organization_id, auth.uid(), coalesce(assigned_role, invitation.role), invitation.role_id, 'active', invitation.invited_by, invitation.invited_at, now())
  on conflict (organization_id, user_id) do update set role = excluded.role, role_id = excluded.role_id, status = 'active', invited_by = excluded.invited_by, invited_at = excluded.invited_at, joined_at = coalesce(public.organization_members.joined_at, excluded.joined_at);
  update public.organization_invitations set status = 'accepted', accepted_by = auth.uid(), accepted_at = now() where id = invitation.id;
  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata) values (invitation.organization_id, auth.uid(), 'accepted', 'organization_invitation', invitation.id, jsonb_build_object('role_id', invitation.role_id));
  select * into accepted_membership from public.organization_members where organization_id = invitation.organization_id and user_id = auth.uid();
  return accepted_membership;
end;
$$;

revoke execute on function public.accept_organization_invitation(text) from public;
grant execute on function public.accept_organization_invitation(text) to authenticated;
