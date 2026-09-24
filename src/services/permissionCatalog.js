export const permissionScopeOptions = [
  { value: 'own', label: 'Own records' },
  { value: 'assigned', label: 'Assigned records' },
  { value: 'team', label: 'Team records' },
  { value: 'any', label: 'Any organization record' },
]

export const organizationRoleCatalog = [
  { key: 'requester', name: 'Requester', description: 'Submit and follow work requests.' },
  { key: 'technician', name: 'Technician', description: 'Perform assigned maintenance work.' },
  { key: 'supervisor', name: 'Supervisor', description: 'Assign, review, and manage operational work.' },
  { key: 'organization_admin', name: 'Organization Admin', description: 'Manage organization users, roles, settings, and data.' },
]

const actionOnly = ['any']
const recordScopes = ['own', 'assigned', 'team', 'any']

function permission(module, key, label, description, scopes = recordScopes, options = {}) {
  return { module, key, label, description, scopes, actionOnly: options.actionOnly ?? false }
}

export const permissionCatalog = [
  permission('Work Orders', 'work_orders.view', 'View work orders', 'See work orders and their details.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.create', 'Create work orders', 'Create new work orders.', ['own', 'any']),
  permission('Work Orders', 'work_orders.edit', 'Edit work orders', 'Edit core work-order details.', ['own', 'team', 'any']),
  permission('Work Orders', 'work_orders.delete', 'Delete work orders', 'Delete work orders.', ['own', 'any']),
  permission('Work Orders', 'work_orders.cancel_skip', 'Cancel/Skip work orders', 'Cancel or skip work orders.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.fill_procedure', 'Fill procedure', 'Complete procedure steps on work orders.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.change_status', 'Change status of work orders', 'Change work-order status.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.assign', 'Assign work orders', 'Assign work to users or teams.', ['team', 'any']),
  permission('Work Orders', 'work_orders.view_comments', 'View comments on work orders', 'Read work-order comments.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.post_comments', 'Post comments on work orders', 'Post work-order comments.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.share_comments', 'Share comments with customers and requesters', 'Share work-order comments externally.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.view_parts', 'View parts on work orders', 'See parts attached to work orders.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.change_part_status', 'Change part status', 'Change the status of parts attached to work orders.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.part_status_assigned', 'Set part status to Assigned', 'Set attached parts to Assigned.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.part_status_reserved', 'Set part status to Reserved', 'Set attached parts to Reserved.', ['assigned', 'team', 'any']),
  permission('Work Orders', 'work_orders.part_status_issued', 'Set part status to Issued', 'Set attached parts to Issued.', ['assigned', 'team', 'any']),
  permission('Requests', 'requests.view', 'View requests', 'See work requests and their details.', ['own', 'team', 'any']),
  permission('Requests', 'requests.create', 'Create requests', 'Submit new work requests.', ['own', 'any']),
  permission('Requests', 'requests.approve', 'Approve requests', 'Approve or decline requests.', actionOnly, { actionOnly: true }),
  permission('Requests', 'requests.edit', 'Edit requests', 'Edit work requests.', ['own', 'any']),
  permission('Requests', 'requests.delete', 'Delete requests', 'Delete work requests.', ['own', 'any']),
  permission('Assets', 'assets.view', 'View assets', 'See assets and their details.', ['assigned', 'team', 'any']),
  permission('Assets', 'assets.create', 'Create assets', 'Create assets.', ['own', 'any']),
  permission('Assets', 'assets.edit', 'Edit assets', 'Edit assets.', ['own', 'team', 'any']),
  permission('Assets', 'assets.delete', 'Delete assets', 'Delete assets.', ['own', 'any']),
  permission('Assets', 'assets.change_status', 'Change status on assets', 'Change asset status.', ['team', 'any']),
  permission('Locations', 'locations.view', 'View locations', 'See locations.', ['team', 'any']),
  permission('Locations', 'locations.create', 'Create locations', 'Create locations.', ['own', 'any']),
  permission('Locations', 'locations.edit', 'Edit locations', 'Edit locations.', ['own', 'any']),
  permission('Locations', 'locations.delete', 'Delete locations', 'Delete locations.', ['own', 'any']),
  permission('Meters', 'meters.view', 'View meters', 'See meters and readings.', ['team', 'any']),
  permission('Meters', 'meters.create', 'Create meters', 'Create meters.', ['own', 'any']),
  permission('Meters', 'meters.edit', 'Edit meters', 'Edit meters.', ['own', 'any']),
  permission('Meters', 'meters.delete', 'Delete meters', 'Delete meters.', ['own', 'any']),
  permission('Parts', 'parts.create', 'Create parts', 'Create parts.', ['own', 'any']),
  permission('Parts', 'parts.edit', 'Edit parts', 'Edit parts and inventory.', ['own', 'team', 'any']),
  permission('Parts', 'parts.delete', 'Delete parts', 'Delete parts.', ['own', 'any']),
  permission('Parts', 'parts.view_costs', 'View part costs', 'View cost information for parts.', ['team', 'any']),
  permission('Procedures', 'procedures.view', 'View procedures', 'See procedures.', ['team', 'any']),
  permission('Procedures', 'procedures.create', 'Create procedures', 'Create procedures.', ['own', 'any']),
  permission('Procedures', 'procedures.edit', 'Edit procedures', 'Edit procedures.', ['own', 'any']),
  permission('Procedures', 'procedures.delete', 'Delete procedures', 'Delete procedures.', ['own', 'any']),
  permission('Purchase Orders', 'purchase_orders.view', 'View purchase orders', 'See purchase orders.', ['team', 'any']),
  permission('Purchase Orders', 'purchase_orders.create', 'Create purchase orders', 'Create purchase orders.', ['own', 'any']),
  permission('Purchase Orders', 'purchase_orders.approve', 'Approve purchase orders', 'Approve purchase orders.', actionOnly, { actionOnly: true }),
  permission('Purchase Orders', 'purchase_orders.view_costs', 'View purchase order costs', 'View purchase-order cost information.', actionOnly, { actionOnly: true }),
  permission('Purchase Orders', 'purchase_orders.edit', 'Edit purchase orders', 'Edit purchase orders.', ['own', 'team', 'any']),
  permission('Purchase Orders', 'purchase_orders.delete', 'Delete purchase orders', 'Delete purchase orders.', ['own', 'any']),
  permission('Purchase Orders', 'purchase_orders.complete', 'Complete purchase orders', 'Complete purchase orders.', ['team', 'any']),
  permission('Purchase Orders', 'purchase_orders.fulfill', 'Fulfill purchase orders', 'Fulfill purchase orders.', ['team', 'any']),
  permission('Work Order Templates', 'work_order_templates.create', 'Create work order templates', 'Create work order templates.', ['own', 'any']),
  permission('Work Order Templates', 'work_order_templates.edit', 'Edit work order templates', 'Edit work order templates.', ['own', 'team', 'any']),
  permission('Work Order Templates', 'work_order_templates.delete', 'Delete work order templates', 'Delete work order templates.', ['own', 'any']),
  permission('Categories', 'categories.view', 'View categories', 'See categories.', actionOnly, { actionOnly: true }),
  permission('Categories', 'categories.create', 'Create categories', 'Create categories.', actionOnly, { actionOnly: true }),
  permission('Categories', 'categories.edit', 'Edit categories', 'Edit categories.', actionOnly, { actionOnly: true }),
  permission('Categories', 'categories.delete', 'Delete categories', 'Delete categories.', actionOnly, { actionOnly: true }),
  permission('Vendors', 'vendors.create', 'Create vendors', 'Create vendors.', actionOnly, { actionOnly: true }),
  permission('Vendors', 'vendors.edit', 'Edit vendors', 'Edit vendors.', actionOnly, { actionOnly: true }),
  permission('Vendors', 'vendors.delete', 'Delete vendors', 'Delete vendors.', actionOnly, { actionOnly: true }),
  permission('Maintenance Plans', 'maintenance_plans.view', 'View maintenance plans', 'See maintenance plans.', ['team', 'any']),
  permission('Maintenance Plans', 'maintenance_plans.create', 'Create maintenance plans', 'Create maintenance plans.', ['own', 'any']),
  permission('Maintenance Plans', 'maintenance_plans.edit', 'Edit maintenance plans', 'Edit maintenance plans.', ['own', 'team', 'any']),
  permission('Maintenance Plans', 'maintenance_plans.delete', 'Delete maintenance plans', 'Delete maintenance plans.', ['own', 'any']),
  permission('Maintenance Plans', 'maintenance_plans.manage_settings', 'Manage maintenance plan settings', 'Manage maintenance-plan settings.', ['any']),
  permission('Organization', 'organization.invite_users', 'Invite users', 'Invite people to the organization.', actionOnly, { actionOnly: true }),
  permission('Organization', 'organization.remove_users', 'Remove users', 'Remove people from the organization.', actionOnly, { actionOnly: true }),
  permission('Organization', 'organization.edit_user_roles', 'Edit user roles', 'Assign organization roles to users.', actionOnly, { actionOnly: true }),
  permission('Organization', 'organization.manage_billing', 'Manage billing', 'Manage subscription and billing.', actionOnly, { actionOnly: true }),
  permission('Organization', 'organization.reporting_view', 'Reporting view', 'View organization reports.', actionOnly, { actionOnly: true }),
  permission('Workstation Mode', 'workstation_mode.edit_pin', 'Edit workstation mode PIN', 'Change the workstation mode PIN.', actionOnly, { actionOnly: true }),
  permission('Messaging', 'messaging.direct', 'Send direct messages', 'Send direct messages.', actionOnly, { actionOnly: true }),
  permission('Messaging', 'messaging.comments', 'Comment on work', 'Post comments on work records.', ['own', 'assigned', 'team', 'any']),
]

const allPermissions = (scope = 'any') => Object.fromEntries(permissionCatalog.map((item) => [item.key, scope]))
const preferredScope = (permission, preferred) => permission.actionOnly ? 'any' : permission.scopes.includes(preferred) ? preferred : permission.scopes.includes('any') ? 'any' : permission.scopes[0]
const baselineForModules = (modules, preferred) => Object.fromEntries(permissionCatalog.filter((permission) => modules.includes(permission.module)).map((permission) => [permission.key, preferredScope(permission, preferred)]))
const baselineForKeys = (keys, preferred) => Object.fromEntries(keys.map((key) => {
  const permission = permissionCatalog.find((item) => item.key === key)
  return [key, preferredScope(permission, preferred)]
}))

export function validatePermissionGrants(grants = {}) {
  for (const [key, scope] of Object.entries(grants)) {
    const permission = permissionCatalog.find((item) => item.key === key)
    if (!permission) throw new Error(`Unknown permission: ${key}`)
    if (!permission.scopes.includes(scope)) throw new Error(`Invalid scope ${scope} for permission ${key}`)
  }
  return grants
}

export function getBaselinePermissions(roleKey) {
  if (roleKey === 'organization_admin') return allPermissions()
  if (roleKey === 'supervisor') return {
    ...baselineForModules(['Work Orders', 'Requests', 'Assets', 'Locations', 'Meters', 'Parts', 'Procedures', 'Purchase Orders', 'Work Order Templates', 'Categories', 'Vendors', 'Maintenance Plans', 'Messaging'], 'team'),
    'requests.approve': 'any', 'purchase_orders.approve': 'any', 'purchase_orders.view_costs': 'any', 'maintenance_plans.manage_settings': 'any',
    'work_orders.view': 'team', 'work_orders.create': 'own', 'work_orders.edit': 'team', 'work_orders.delete': 'own', 'work_orders.assign': 'team',
  }
  if (roleKey === 'technician') return {
    ...baselineForKeys([
    'work_orders.view', 'work_orders.create', 'work_orders.edit', 'work_orders.delete', 'work_orders.cancel_skip', 'work_orders.fill_procedure', 'work_orders.change_status', 'work_orders.view_comments', 'work_orders.post_comments', 'work_orders.view_parts', 'work_orders.change_part_status', 'work_orders.part_status_assigned', 'work_orders.part_status_reserved', 'work_orders.part_status_issued',
    'requests.view', 'requests.create', 'requests.edit', 'assets.view', 'parts.create', 'parts.edit', 'parts.view_costs', 'locations.view', 'meters.view', 'procedures.view', 'maintenance_plans.view', 'messaging.direct', 'messaging.comments',
    ], 'assigned'),
    'work_orders.create': 'own', 'work_orders.edit': 'own', 'work_orders.delete': 'own', 'requests.create': 'own', 'requests.edit': 'own', 'messaging.comments': 'assigned',
  }
  if (roleKey === 'requester') return baselineForKeys(['requests.view', 'requests.create', 'requests.edit', 'messaging.direct', 'messaging.comments'], 'own')
  return {}
}
