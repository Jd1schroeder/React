export function auditActorName(event) {
  const name = [event.actor?.first_name, event.actor?.last_name].filter(Boolean).join(' ')
  return name || 'System'
}

export function auditInitialPermissionItems(event) {
  return (event.metadata?.permissions ?? []).map(({ permission_key, scope }) => `${permission_key}${scope ? ` (${scope})` : ''}`)
}

export function auditEventDescription(event) {
  const metadata = event.metadata ?? {}
  if (event.action === 'role_changed') return `Role changed from ${metadata.previous_role_name || 'previous role'} to ${metadata.role_name || 'new role'}.`
  if (event.action === 'status_changed') return `Status changed from ${metadata.previous_status || 'previous status'} to ${metadata.status || 'new status'}.`
  if (event.action === 'permission_granted') return `Granted ${metadata.permission_key}${metadata.scope ? ` (${metadata.scope})` : ''}.`
  if (event.action === 'permission_revoked') return `Revoked ${metadata.permission_key}.`
  if (event.action === 'permission_changed') return `Changed ${metadata.permission_key} from ${metadata.previous_scope} to ${metadata.scope}.`
  if (event.action === 'created_with_permissions') return `Created role “${metadata.name || 'role'}”${metadata.source_role_name ? ` copied from “${metadata.source_role_name}”` : ''}.`
  if (event.entity_type === 'organization_role' && event.action === 'created') return `Created role ${metadata.name || 'role'}.`
  if (event.entity_type === 'organization_role' && event.action === 'deleted') return `Deleted role ${metadata.name || 'role'}.`
  if (event.entity_type === 'organization_role' && event.action === 'updated') return `Updated role ${metadata.name || metadata.previous_name || 'role'}.`
  return `${event.action.charAt(0).toUpperCase()}${event.action.slice(1)} ${event.entity_type.replaceAll('_', ' ')}.`
}
