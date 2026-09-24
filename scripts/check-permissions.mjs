import { getBaselinePermissions, organizationRoleCatalog, permissionCatalog, validatePermissionGrants } from '../src/services/permissionCatalog.js'

const fail = (message) => { throw new Error(`Permission check failed: ${message}`) }
const definitions = new Map(permissionCatalog.map((permission) => [permission.key, permission]))

if (definitions.size !== permissionCatalog.length) fail('permission keys must be unique')
if (organizationRoleCatalog.map((role) => role.key).join(',') !== 'requester,technician,supervisor,organization_admin') fail('built-in role catalog changed unexpectedly')

for (const permission of permissionCatalog) {
  if (!permission.module || !permission.label || !permission.description || !permission.scopes.length) fail(`${permission.key} is missing metadata`)
  if (permission.actionOnly && permission.scopes.join(',') !== 'any') fail(`${permission.key} action-only grants must use any`)
}

for (const roleKey of organizationRoleCatalog.map((role) => role.key)) {
  for (const [permissionKey, scope] of Object.entries(getBaselinePermissions(roleKey))) {
    const permission = definitions.get(permissionKey)
    if (!permission) fail(`${roleKey} references unknown permission ${permissionKey}`)
    if (!permission.scopes.includes(scope)) fail(`${roleKey} assigns invalid scope ${scope} to ${permissionKey}`)
  }
}

const requester = getBaselinePermissions('requester')
const technician = getBaselinePermissions('technician')
const supervisor = getBaselinePermissions('supervisor')
const organizationAdmin = getBaselinePermissions('organization_admin')

if (requester['work_orders.view'] || requester['work_orders.create'] || requester['work_orders.edit']) fail('Requester must not receive Work Order permissions')
if (technician['work_orders.edit'] !== 'own') fail('Technician core Work Order editing must be own')
if (technician['work_orders.change_status'] !== 'assigned') fail('Technician status changes must be assigned')
if (technician['work_orders.fill_procedure'] !== 'assigned') fail('Technician procedure progress must be assigned')
if (technician['work_orders.edit'] === 'assigned' || technician['work_orders.edit'] === 'team') fail('Technician core editing must not be assignment- or team-scoped')
if (supervisor['work_orders.view'] !== 'team' || supervisor['work_orders.edit'] !== 'team') fail('Supervisor Work Order access must be team-scoped')
if (supervisor['work_orders.change_status'] !== 'team' || supervisor['work_orders.assign'] !== 'team') fail('Supervisor must manage team Work Order execution')
if (organizationAdmin['organization.manage_billing'] !== 'any') fail('Organization Admin must manage billing')
if (Object.keys(organizationAdmin).length !== permissionCatalog.length) fail('Organization Admin must receive the complete catalog')
if (Object.values(organizationAdmin).some((scope) => scope !== 'any')) fail('Organization Admin grants must be organization-wide')

const customRole = { ...getBaselinePermissions('technician'), 'work_orders.view': 'any' }
validatePermissionGrants(customRole)
validatePermissionGrants({ 'work_orders.view': 'assigned', 'organization.manage_billing': 'any' })
try { validatePermissionGrants({ 'work_orders.view': 'own' }); fail('invalid custom grant was accepted') } catch (error) { if (error.message === 'invalid custom grant was accepted') throw error }

console.log(`Permission contract passed: ${permissionCatalog.length} permissions, ${organizationRoleCatalog.length} built-in roles.`)
