import { supabase } from '../lib/supabase'

export async function recordAuditEvent({ organizationId, action, entityType, entityId = null, metadata = {} }) {
  const { data, error } = await supabase.rpc('record_audit_event', {
    target_organization_id: organizationId,
    event_action: action,
    event_entity_type: entityType,
    event_entity_id: entityId,
    event_metadata: metadata,
  })
  if (error) throw error
  return data
}
