-- New organizations must receive the same system-role foundation as existing
-- organizations. This also assigns the creating owner before membership-role
-- validation runs.

create or replace function public.seed_system_organization_roles(
  target_organization_id uuid,
  role_creator_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_admin_role_id uuid;
begin
  insert into public.organization_roles (organization_id, name, description, is_system, system_key, created_by)
  values
    (target_organization_id, 'Requester', 'Submit and follow work requests.', true, 'requester', role_creator_id),
    (target_organization_id, 'Technician', 'Perform assigned maintenance work.', true, 'technician', role_creator_id),
    (target_organization_id, 'Supervisor', 'Assign, review, and manage operational work.', true, 'supervisor', role_creator_id),
    (target_organization_id, 'Organization Admin', 'Manage organization users, roles, settings, and data.', true, 'organization_admin', role_creator_id)
  on conflict (organization_id, system_key) where is_system = true do nothing;

  insert into public.organization_role_permissions (role_id, permission_key, scope)
  select roles.id, grants.permission_key, grants.scope
  from public.organization_roles roles
  join (values
    ('requester', 'requests.view', 'own'), ('requester', 'requests.create', 'own'), ('requester', 'requests.edit', 'own'), ('requester', 'messaging.direct', 'any'), ('requester', 'messaging.comments', 'own'),
    ('technician', 'work_orders.view', 'assigned'), ('technician', 'work_orders.create', 'own'), ('technician', 'work_orders.edit', 'own'), ('technician', 'work_orders.delete', 'own'), ('technician', 'work_orders.cancel_skip', 'assigned'), ('technician', 'work_orders.fill_procedure', 'assigned'), ('technician', 'work_orders.change_status', 'assigned'), ('technician', 'work_orders.view_comments', 'assigned'), ('technician', 'work_orders.post_comments', 'assigned'), ('technician', 'work_orders.view_parts', 'assigned'), ('technician', 'work_orders.change_part_status', 'assigned'), ('technician', 'work_orders.part_status_assigned', 'assigned'), ('technician', 'work_orders.part_status_reserved', 'assigned'), ('technician', 'work_orders.part_status_issued', 'assigned'), ('technician', 'requests.view', 'own'), ('technician', 'requests.create', 'own'), ('technician', 'requests.edit', 'own'), ('technician', 'assets.view', 'assigned'), ('technician', 'locations.view', 'any'), ('technician', 'meters.view', 'any'), ('technician', 'procedures.view', 'any'), ('technician', 'maintenance_plans.view', 'any'), ('technician', 'messaging.direct', 'any'), ('technician', 'messaging.comments', 'assigned'),
    ('supervisor', 'work_orders.view', 'team'), ('supervisor', 'work_orders.create', 'own'), ('supervisor', 'work_orders.edit', 'team'), ('supervisor', 'work_orders.delete', 'own'), ('supervisor', 'work_orders.assign', 'team'), ('supervisor', 'work_orders.change_status', 'team'), ('supervisor', 'work_orders.fill_procedure', 'team'), ('supervisor', 'requests.view', 'team'), ('supervisor', 'requests.create', 'own'), ('supervisor', 'requests.edit', 'own'), ('supervisor', 'requests.approve', 'any'), ('supervisor', 'assets.view', 'team'), ('supervisor', 'assets.create', 'own'), ('supervisor', 'assets.edit', 'team'), ('supervisor', 'locations.view', 'any'), ('supervisor', 'parts.edit', 'team'), ('supervisor', 'purchase_orders.view', 'team'), ('supervisor', 'purchase_orders.create', 'own'), ('supervisor', 'purchase_orders.approve', 'any'), ('supervisor', 'maintenance_plans.view', 'team'), ('supervisor', 'maintenance_plans.manage_settings', 'any'), ('supervisor', 'messaging.direct', 'any'), ('supervisor', 'messaging.comments', 'team')
  ) grants(system_key, permission_key, scope) on grants.system_key = roles.system_key
  where roles.organization_id = target_organization_id and roles.is_system = true
  on conflict (role_id, permission_key) do nothing;

  insert into public.organization_role_permissions (role_id, permission_key, scope)
  select admin_roles.id, catalog.permission_key, 'any'
  from public.organization_roles admin_roles
  cross join (values
    ('work_orders.view'), ('work_orders.create'), ('work_orders.edit'), ('work_orders.delete'), ('work_orders.cancel_skip'), ('work_orders.fill_procedure'), ('work_orders.change_status'), ('work_orders.assign'), ('work_orders.view_comments'), ('work_orders.post_comments'), ('work_orders.share_comments'), ('work_orders.view_parts'), ('work_orders.change_part_status'), ('work_orders.part_status_assigned'), ('work_orders.part_status_reserved'), ('work_orders.part_status_issued'), ('requests.view'), ('requests.create'), ('requests.approve'), ('requests.edit'), ('requests.delete'), ('assets.view'), ('assets.create'), ('assets.edit'), ('assets.delete'), ('assets.change_status'), ('locations.view'), ('locations.create'), ('locations.edit'), ('locations.delete'), ('meters.view'), ('meters.create'), ('meters.edit'), ('meters.delete'), ('parts.create'), ('parts.edit'), ('parts.delete'), ('parts.view_costs'), ('procedures.view'), ('procedures.create'), ('procedures.edit'), ('procedures.delete'), ('purchase_orders.view'), ('purchase_orders.create'), ('purchase_orders.approve'), ('purchase_orders.view_costs'), ('purchase_orders.edit'), ('purchase_orders.delete'), ('purchase_orders.complete'), ('purchase_orders.fulfill'), ('work_order_templates.create'), ('work_order_templates.edit'), ('work_order_templates.delete'), ('categories.view'), ('categories.create'), ('categories.edit'), ('categories.delete'), ('vendors.create'), ('vendors.edit'), ('vendors.delete'), ('maintenance_plans.view'), ('maintenance_plans.create'), ('maintenance_plans.edit'), ('maintenance_plans.delete'), ('maintenance_plans.manage_settings'), ('organization.invite_users'), ('organization.remove_users'), ('organization.edit_user_roles'), ('organization.manage_billing'), ('organization.reporting_view'), ('workstation_mode.edit_pin'), ('messaging.direct'), ('messaging.comments')
  ) catalog(permission_key)
  where admin_roles.organization_id = target_organization_id
    and admin_roles.is_system = true
    and admin_roles.system_key = 'organization_admin'
  on conflict (role_id, permission_key) do nothing;

  select id into organization_admin_role_id
  from public.organization_roles
  where organization_id = target_organization_id
    and is_system = true
    and system_key = 'organization_admin';

  return organization_admin_role_id;
end;
$$;

revoke all on function public.seed_system_organization_roles(uuid, uuid) from public;

do $$
declare
  organization_record record;
  organization_admin_role_id uuid;
begin
  for organization_record in
    select organizations.id, organizations.created_by
    from public.organizations
  loop
    organization_admin_role_id := public.seed_system_organization_roles(organization_record.id, organization_record.created_by);
    update public.organization_members
    set role_id = organization_admin_role_id
    where organization_id = organization_record.id
      and role_id is null
      and role in ('owner', 'admin');
  end loop;
end;
$$;

create or replace function public.provision_user_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_id uuid;
  organization_admin_role_id uuid;
  organization_name text := nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), '');
begin
  insert into public.profiles (id, first_name, last_name, phone)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'last_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do update
    set first_name = coalesce(public.profiles.first_name, excluded.first_name),
        last_name = coalesce(public.profiles.last_name, excluded.last_name),
        phone = coalesce(public.profiles.phone, excluded.phone);

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if organization_name is null then
    return new;
  end if;

  insert into public.organizations (name, created_by)
  values (organization_name, new.id)
  returning id into organization_id;

  organization_admin_role_id := public.seed_system_organization_roles(organization_id, new.id);

  insert into public.organization_members (organization_id, user_id, role, role_id, status, joined_at)
  values (organization_id, new.id, 'owner', organization_admin_role_id, 'active', now());

  return new;
end;
$$;

select 'new organization system roles provisioned' as result;
