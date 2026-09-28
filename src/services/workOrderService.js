import { supabase } from '../lib/supabase'
import { assertPermission } from './authorizationService'

const workOrderFields = 'id, organization_id, title, description, status, priority, procedure_progress, due_at, requester_id, assigned_to, team_id, created_by, created_at, updated_at, updated_by'

export async function listWorkOrders(organizationId, grants) {
  assertPermission(grants, 'work_orders.view')
  const { data, error } = await supabase
    .from('work_orders')
    .select(workOrderFields)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createWorkOrder({ organizationId, title, description, priority = 'Medium', dueAt, requesterId, assignedTo, teamId, grants }) {
  assertPermission(grants, 'work_orders.create')
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('You must be signed in to create a Work Order.')
  const { data, error } = await supabase
    .from('work_orders')
    .insert({ organization_id: organizationId, title: title.trim(), description: description?.trim() || null, priority, due_at: dueAt ?? null, requester_id: requesterId ?? null, assigned_to: assignedTo ?? null, team_id: teamId ?? null, created_by: authData.user.id })
    .select(workOrderFields)
    .single()
  if (error) throw error
  return data
}

export async function updateWorkOrder({ organizationId, workOrderId, updates, grants, permissionKey = 'work_orders.edit', record }) {
  assertPermission(grants, permissionKey, record)
  const { data, error } = await supabase
    .from('work_orders')
    .update(updates)
    .eq('organization_id', organizationId)
    .eq('id', workOrderId)
    .select(workOrderFields)
    .single()
  if (error) throw error
  return data
}

export async function updateWorkOrderExecution({ organizationId, workOrderId, status, procedureProgress, grants, record }) {
  const updates = {}
  if (status !== undefined) updates.status = status
  if (procedureProgress !== undefined) updates.procedure_progress = procedureProgress
  const permissionKey = status !== undefined ? 'work_orders.change_status' : 'work_orders.fill_procedure'
  return updateWorkOrder({ organizationId, workOrderId, updates, grants, permissionKey, record })
}
