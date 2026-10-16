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

export async function listAuditEvents({ organizationId, entityId, entityTypes = [], actions = [], limit = 50 }) {
  let query = supabase
    .from('audit_events')
    .select('id, organization_id, actor_id, action, entity_type, entity_id, metadata, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (entityId) query = query.eq('entity_id', entityId)
  if (entityTypes.length) query = query.in('entity_type', entityTypes)
  if (actions.length) query = query.in('action', actions)
  const { data, error } = await query
  if (error) throw error
  const actorIds = [...new Set((data ?? []).map((event) => event.actor_id).filter(Boolean))]
  const { data: actors, error: actorsError } = actorIds.length
    ? await supabase.from('profiles').select('id, first_name, last_name').in('id', actorIds)
    : { data: [], error: null }
  if (actorsError) throw actorsError
  const actorsById = new Map((actors ?? []).map((actor) => [actor.id, actor]))
  return (data ?? []).map((event) => ({ ...event, actor: actorsById.get(event.actor_id) ?? null }))
}
