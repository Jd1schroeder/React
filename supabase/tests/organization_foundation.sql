-- Structural assertions for the organization/user foundation.
-- Run after applying migrations in a Supabase/Postgres test database.
do $$
declare
  required_table text;
  required_tables text[] := array[
    'public.organizations',
    'public.organization_members',
    'public.profiles',
    'public.user_preferences',
    'public.organization_invitations',
    'public.audit_events',
    'public.organization_roles',
    'public.organization_role_permissions'
    ,'public.work_orders'
  ];
  required_function text;
  required_functions text[] := array[
    'public.provision_user_organization()',
    'public.set_updated_at()',
    'public.is_organization_admin(uuid)',
    'public.is_organization_owner(uuid)',
    'public.protect_organization_membership()',
    'public.audit_organization_mutation()',
    'public.accept_organization_invitation(text)',
    'public.record_audit_event(uuid,text,text,uuid,jsonb)'
    ,'public.has_organization_permission(uuid,text,text)'
    ,'public.has_organization_record_permission(uuid,text,uuid,uuid,boolean)'
    ,'public.delete_custom_organization_role(uuid,uuid)'
  ];
begin
  foreach required_table in array required_tables loop
    if to_regclass(required_table) is null then
      raise exception 'Missing required table: %', required_table;
    end if;
  end loop;

  foreach required_function in array required_functions loop
    if to_regprocedure(required_function) is null then
      raise exception 'Missing required function: %', required_function;
    end if;
  end loop;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'phone'
  ) then
    raise exception 'Missing profiles.phone column';
  end if;

  foreach required_table in array array['organizations', 'organization_members', 'profiles', 'user_preferences', 'organization_invitations'] loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = required_table
        and column_name = 'updated_by'
    ) then
      raise exception 'Missing public.%.updated_by column', required_table;
    end if;
  end loop;

  if not (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass) then
    raise exception 'RLS is not enabled for organizations';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.organization_members'::regclass) then
    raise exception 'RLS is not enabled for organization_members';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass) then
    raise exception 'RLS is not enabled for profiles';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass) then
    raise exception 'RLS is not enabled for user_preferences';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.organization_invitations'::regclass) then
    raise exception 'RLS is not enabled for organization_invitations';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass) then
    raise exception 'RLS is not enabled for audit_events';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.organization_roles'::regclass) then
    raise exception 'RLS is not enabled for organization_roles';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.organization_role_permissions'::regclass) then
    raise exception 'RLS is not enabled for organization_role_permissions';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.work_orders'::regclass) then
    raise exception 'RLS is not enabled for work_orders';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organization_members' and column_name = 'role_id'
  ) then
    raise exception 'Missing organization_members.role_id column';
  end if;

  if to_regclass('public.organization_members_user_id_idx') is null then
    raise exception 'Missing organization membership lookup index';
  end if;
  if to_regclass('public.organizations_slug_unique_idx') is null then
    raise exception 'Missing organization slug uniqueness index';
  end if;
  if to_regclass('public.organization_invitations_pending_contact_idx') is null then
    raise exception 'Missing pending invitation uniqueness index';
  end if;
  if to_regclass('public.audit_events_organization_created_idx') is null then
    raise exception 'Missing audit event query index';
  end if;
  if to_regclass('public.organization_roles_system_key_idx') is null then
    raise exception 'Missing system role uniqueness index';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.organization_members'::regclass
      and tgname = 'protect_organization_membership'
  ) then
    raise exception 'Missing membership lifecycle protection trigger';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_events'
      and policyname = 'Organization admins can view audit events'
  ) then
      raise exception 'Missing administrator audit read policy';
  end if;

  if not exists (
    select 1
    from public.organization_roles roles
    join public.organization_role_permissions grants on grants.role_id = roles.id
    where roles.system_key = 'technician' and grants.permission_key = 'work_orders.edit' and grants.scope = 'own'
  ) then
    raise exception 'Technician core Work Order edit grant must be own-scoped';
  end if;
  if not exists (
    select 1
    from public.organization_roles roles
    join public.organization_role_permissions grants on grants.role_id = roles.id
    where roles.system_key = 'technician' and grants.permission_key = 'work_orders.change_status' and grants.scope = 'assigned'
  ) then
    raise exception 'Technician Work Order status grant must be assigned-scoped';
  end if;
  if not exists (
    select 1
    from public.organization_roles roles
    join public.organization_role_permissions grants on grants.role_id = roles.id
      where roles.system_key = 'organization_admin' and grants.permission_key = 'organization.manage_billing' and grants.scope = 'any'
  ) then
    raise exception 'Organization Admin billing grant is missing';
  end if;
  if exists (
    select 1
    from unnest(array['requester', 'technician', 'supervisor', 'organization_admin']) as expected(system_key)
    where not exists (select 1 from public.organization_roles roles where roles.system_key = expected.system_key and roles.is_system = true)
  ) then
    raise exception 'One or more built-in organization roles are missing';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_role_permissions'
      and policyname = 'Members with role management permission can create role permissions'
  ) then
    raise exception 'Role-permission creation is not governed by organization.edit_user_roles';
  end if;
  if not exists (
    select 1 from pg_trigger
      where tgrelid = 'public.work_orders'::regclass
      and tgname = 'work_orders_enforce_permissions'
  ) then
    raise exception 'Missing Work Order authorization trigger';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_roles'
      and policyname = 'Members with role management permission can create roles'
  ) then
    raise exception 'Role creation is not governed by organization.edit_user_roles';
  end if;
end;
$$;

select 'organization foundation structural assertions passed' as result;
