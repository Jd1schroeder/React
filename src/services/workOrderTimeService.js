import { supabase } from '../lib/supabase'
import { assertPermission } from './authorizationService'

const timeEntryFields = 'id, organization_id, work_order_id, user_id, created_by, tracking_type_id, source, status, duration_seconds, active_started_at, hourly_rate, notes, created_at, updated_at, completed_at, work_order_tracking_types(id, kind, name)'
const costEntryFields = 'id, organization_id, work_order_id, user_id, created_by, tracking_type_id, amount, description, created_at, updated_at, work_order_tracking_types(id, kind, name)'

function assertWorkOrderView(grants, record) {
  assertPermission(grants, 'work_orders.view', record)
}

export async function listWorkOrderTrackingTypes({ organizationId, kind = 'time' }) {
  const { data, error } = await supabase
    .from('work_order_tracking_types')
    .select('id, organization_id, kind, name, is_system, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('kind', kind)
    .order('is_system', { ascending: false })
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function listWorkOrderTimeEntries({ organizationId, workOrderId, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase
    .from('work_order_time_entries')
    .select(timeEntryFields)
    .eq('organization_id', organizationId)
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function startWorkOrderTimer({ workOrderId, trackingTypeId, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase.rpc('start_work_order_timer', {
    target_work_order_id: workOrderId,
    target_tracking_type_id: trackingTypeId ?? null,
  })
  if (error) throw error
  return data
}

export async function resumeWorkOrderTimer({ timeEntryId, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase.rpc('resume_work_order_timer', { target_time_entry_id: timeEntryId })
  if (error) throw error
  return data
}

export async function pauseWorkOrderTimer({ timeEntryId, finalize = false, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase.rpc('pause_work_order_timer', {
    target_time_entry_id: timeEntryId,
    finalize,
  })
  if (error) throw error
  return data
}

export async function createWorkOrderTimeEntry({ workOrderId, userId, trackingTypeId, durationSeconds, hourlyRate, notes, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase.rpc('create_work_order_time_entry', {
    target_work_order_id: workOrderId,
    target_user_id: userId ?? null,
    target_tracking_type_id: trackingTypeId,
    target_duration_seconds: durationSeconds,
    target_hourly_rate: hourlyRate ?? null,
    target_notes: notes?.trim() || null,
  })
  if (error) throw error
  return data
}

export async function listWorkOrderCostEntries({ organizationId, workOrderId, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase
    .from('work_order_cost_entries')
    .select(costEntryFields)
    .eq('organization_id', organizationId)
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createWorkOrderCostEntry({ workOrderId, userId, trackingTypeId, amount, description, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase.rpc('create_work_order_cost_entry', {
    target_work_order_id: workOrderId,
    target_user_id: userId ?? null,
    target_tracking_type_id: trackingTypeId,
    target_amount: amount,
    target_description: description?.trim() || null,
  })
  if (error) throw error
  return data
}

export async function updateWorkOrderTimeEntry({ timeEntryId, trackingTypeId, durationSeconds, hourlyRate, notes, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase.rpc('update_work_order_time_entry', {
    target_time_entry_id: timeEntryId,
    target_tracking_type_id: trackingTypeId,
    target_duration_seconds: durationSeconds,
    target_hourly_rate: hourlyRate ?? null,
    target_notes: notes?.trim() || null,
  })
  if (error) throw error
  return data
}

export async function deleteWorkOrderTimeEntry({ timeEntryId, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase.rpc('delete_work_order_time_entry', { target_time_entry_id: timeEntryId })
  if (error) throw error
  return data
}

export async function updateWorkOrderCostEntry({ costEntryId, trackingTypeId, amount, description, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase.rpc('update_work_order_cost_entry', {
    target_cost_entry_id: costEntryId,
    target_tracking_type_id: trackingTypeId,
    target_amount: amount,
    target_description: description?.trim() || null,
  })
  if (error) throw error
  return data
}

export async function deleteWorkOrderCostEntry({ costEntryId, grants, record }) {
  assertWorkOrderView(grants, record)
  const { data, error } = await supabase.rpc('delete_work_order_cost_entry', { target_cost_entry_id: costEntryId })
  if (error) throw error
  return data
}

export async function createWorkOrderTrackingType({ organizationId, kind, name }) {
  const { data, error } = await supabase.from('work_order_tracking_types').insert({ organization_id: organizationId, kind, name: name.trim(), is_system: false }).select('id, organization_id, kind, name, is_system, created_at, updated_at').single()
  if (error) throw error
  return data
}

export async function updateWorkOrderTrackingType({ typeId, name }) {
  const { data, error } = await supabase.from('work_order_tracking_types').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('id', typeId).eq('is_system', false).select('id, organization_id, kind, name, is_system, created_at, updated_at').single()
  if (error) throw error
  return data
}

export async function deleteWorkOrderTrackingType({ typeId }) {
  const { error } = await supabase.from('work_order_tracking_types').delete().eq('id', typeId).eq('is_system', false)
  if (error) throw error
}
