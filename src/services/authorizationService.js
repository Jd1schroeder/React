const recordScopes = new Set(['own', 'assigned', 'team', 'any'])

export function permissionMap(rows = []) {
  if (rows instanceof Map) return Object.fromEntries(rows)
  if (!Array.isArray(rows)) return { ...rows }
  return Object.fromEntries(rows.map((row) => [row.permission_key, row.scope]))
}

export function hasPermission(grants, permissionKey) {
  return Boolean(permissionMap(grants)[permissionKey])
}

export function canAccessRecord(grants, permissionKey, { userId, ownerId, assigneeId, teamId, teamIds = [], isTeamRecord = false } = {}) {
  const scope = permissionMap(grants)[permissionKey]
  if (!scope || !recordScopes.has(scope)) return false
  if (scope === 'any') return true
  if (scope === 'own') return Boolean(userId && ownerId && userId === ownerId)
  if (scope === 'assigned') return Boolean(userId && assigneeId && userId === assigneeId)
  return Boolean(isTeamRecord || (teamId && teamIds.includes(teamId)))
}

export function assertPermission(grants, permissionKey, context) {
  const allowed = context ? canAccessRecord(grants, permissionKey, context) : hasPermission(grants, permissionKey)
  if (!allowed) throw new Error(`You do not have permission to perform ${permissionKey}.`)
  return true
}
