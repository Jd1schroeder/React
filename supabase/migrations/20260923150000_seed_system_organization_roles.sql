create unique index if not exists organization_roles_system_key_idx
  on public.organization_roles(organization_id, system_key)
  where is_system = true;

with role_definitions(system_key, name, description) as (
  values
    ('requester', 'Requester', 'Submit and follow work requests.'),
    ('technician', 'Technician', 'Perform assigned maintenance work.'),
    ('supervisor', 'Supervisor', 'Assign, review, and manage operational work.'),
    ('organization_admin', 'Organization Admin', 'Manage organization users, roles, settings, and data.')
), organization_creators as (
  select organizations.id as organization_id,
    coalesce(
      (select user_id from public.organization_members where organization_id = organizations.id and role = 'owner' and status = 'active' limit 1),
      (select user_id from public.organization_members where organization_id = organizations.id and status = 'active' order by created_at limit 1)
    ) as created_by
  from public.organizations
)
insert into public.organization_roles (organization_id, name, description, is_system, system_key, created_by)
select organization_creators.organization_id, role_definitions.name, role_definitions.description, true, role_definitions.system_key, organization_creators.created_by
from organization_creators cross join role_definitions
where organization_creators.created_by is not null
  and not exists (
    select 1 from public.organization_roles existing
    where existing.organization_id = organization_creators.organization_id
      and existing.system_key = role_definitions.system_key
  );

with grants(system_key, permission_key, scope) as (
  values
    ('requester', 'requests.view', 'own'), ('requester', 'requests.create', 'own'), ('requester', 'requests.edit', 'own'), ('requester', 'messaging.direct', 'any'), ('requester', 'messaging.comments', 'own'),
    ('technician', 'work_orders.view', 'assigned'), ('technician', 'work_orders.create', 'own'), ('technician', 'work_orders.edit', 'own'), ('technician', 'work_orders.delete', 'own'), ('technician', 'work_orders.cancel_skip', 'assigned'), ('technician', 'work_orders.fill_procedure', 'assigned'), ('technician', 'work_orders.change_status', 'assigned'), ('technician', 'work_orders.view_comments', 'assigned'), ('technician', 'work_orders.post_comments', 'assigned'), ('technician', 'work_orders.view_parts', 'assigned'), ('technician', 'work_orders.change_part_status', 'assigned'), ('technician', 'work_orders.part_status_assigned', 'assigned'), ('technician', 'work_orders.part_status_reserved', 'assigned'), ('technician', 'work_orders.part_status_issued', 'assigned'), ('technician', 'requests.view', 'own'), ('technician', 'requests.create', 'own'), ('technician', 'requests.edit', 'own'), ('technician', 'assets.view', 'assigned'), ('technician', 'locations.view', 'any'), ('technician', 'meters.view', 'any'), ('technician', 'procedures.view', 'any'), ('technician', 'maintenance_plans.view', 'any'), ('technician', 'messaging.direct', 'any'), ('technician', 'messaging.comments', 'assigned'),
    ('supervisor', 'work_orders.view', 'team'), ('supervisor', 'work_orders.create', 'own'), ('supervisor', 'work_orders.edit', 'team'), ('supervisor', 'work_orders.delete', 'own'), ('supervisor', 'work_orders.assign', 'team'), ('supervisor', 'work_orders.change_status', 'team'), ('supervisor', 'work_orders.fill_procedure', 'team'), ('supervisor', 'requests.view', 'team'), ('supervisor', 'requests.create', 'own'), ('supervisor', 'requests.edit', 'own'), ('supervisor', 'requests.approve', 'any'), ('supervisor', 'assets.view', 'team'), ('supervisor', 'assets.create', 'own'), ('supervisor', 'assets.edit', 'team'), ('supervisor', 'locations.view', 'any'), ('supervisor', 'parts.edit', 'team'), ('supervisor', 'purchase_orders.view', 'team'), ('supervisor', 'purchase_orders.create', 'own'), ('supervisor', 'purchase_orders.approve', 'any'), ('supervisor', 'maintenance_plans.view', 'team'), ('supervisor', 'maintenance_plans.manage_settings', 'any'), ('supervisor', 'messaging.direct', 'any'), ('supervisor', 'messaging.comments', 'team')
), role_permissions as (
  select roles.id as role_id, grants.permission_key, grants.scope
  from public.organization_roles roles join grants on grants.system_key = roles.system_key
  where roles.is_system = true
)
insert into public.organization_role_permissions (role_id, permission_key, scope)
select role_permissions.role_id, role_permissions.permission_key, role_permissions.scope
from role_permissions
on conflict (role_id, permission_key) do nothing;

update public.organization_members members
set role_id = roles.id
from public.organization_roles roles
where members.organization_id = roles.organization_id
  and roles.is_system = true
  and roles.system_key = 'organization_admin'
  and members.role_id is null
  and members.role in ('owner', 'admin');

insert into public.organization_role_permissions (role_id, permission_key, scope)
select roles.id, catalog.permission_key, 'any'
from public.organization_roles roles
cross join (values
  ('work_orders.view'), ('work_orders.create'), ('work_orders.edit'), ('work_orders.delete'), ('work_orders.cancel_skip'), ('work_orders.fill_procedure'), ('work_orders.change_status'), ('work_orders.assign'), ('work_orders.view_comments'), ('work_orders.post_comments'), ('work_orders.share_comments'), ('work_orders.view_parts'), ('work_orders.change_part_status'), ('work_orders.part_status_assigned'), ('work_orders.part_status_reserved'), ('work_orders.part_status_issued'), ('requests.view'), ('requests.create'), ('requests.approve'), ('requests.edit'), ('requests.delete'), ('assets.view'), ('assets.create'), ('assets.edit'), ('assets.delete'), ('assets.change_status'), ('locations.view'), ('locations.create'), ('locations.edit'), ('locations.delete'), ('meters.view'), ('meters.create'), ('meters.edit'), ('meters.delete'), ('parts.create'), ('parts.edit'), ('parts.delete'), ('parts.view_costs'), ('procedures.view'), ('procedures.create'), ('procedures.edit'), ('procedures.delete'), ('purchase_orders.view'), ('purchase_orders.create'), ('purchase_orders.approve'), ('purchase_orders.view_costs'), ('purchase_orders.edit'), ('purchase_orders.delete'), ('purchase_orders.complete'), ('purchase_orders.fulfill'), ('work_order_templates.create'), ('work_order_templates.edit'), ('work_order_templates.delete'), ('categories.view'), ('categories.create'), ('categories.edit'), ('categories.delete'), ('vendors.create'), ('vendors.edit'), ('vendors.delete'), ('maintenance_plans.view'), ('maintenance_plans.create'), ('maintenance_plans.edit'), ('maintenance_plans.delete'), ('maintenance_plans.manage_settings'), ('organization.invite_users'), ('organization.remove_users'), ('organization.edit_user_roles'), ('organization.manage_billing'), ('organization.reporting_view'), ('workstation_mode.edit_pin'), ('messaging.direct'), ('messaging.comments')
) catalog(permission_key)
where roles.is_system = true and roles.system_key = 'organization_admin'
on conflict (role_id, permission_key) do nothing;
