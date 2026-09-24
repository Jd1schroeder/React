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
    join public.organization_role_permissions grants on grants.role_id = members.role_id
    where members.organization_id = target_organization_id
      and members.user_id = auth.uid()
      and members.status = 'active'
      and grants.permission_key = target_permission_key
      and (grants.scope = 'any' or grants.scope = required_scope)
  );
$$;

revoke execute on function public.has_organization_permission(uuid, text, text) from public;
grant execute on function public.has_organization_permission(uuid, text, text) to authenticated;

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

revoke execute on function public.has_organization_record_permission(uuid, text, uuid, uuid, boolean) from public;
grant execute on function public.has_organization_record_permission(uuid, text, uuid, uuid, boolean) to authenticated;

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
  if not public.is_organization_admin(target_organization_id) then
    raise exception 'Only organization administrators can delete roles';
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

revoke execute on function public.delete_custom_organization_role(uuid, uuid) from public;
grant execute on function public.delete_custom_organization_role(uuid, uuid) to authenticated;
