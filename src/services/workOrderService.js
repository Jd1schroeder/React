import { supabase } from '../lib/supabase'
import { assertPermission } from './authorizationService'
import { WORK_ORDER_ATTACHMENT_MAX_BYTES, getSafeAttachmentExtension } from '../utils/workOrderAttachments'
import { normalizeWorkOrderFilters } from '../utils/workOrderFilters'

const workOrderFields = 'id, work_order_number, organization_id, title, description, status, priority, procedure_progress, due_at, due_date, due_time, start_date, estimated_duration_minutes, work_type, requester_id, assigned_to, team_id, created_by, created_at, updated_at, updated_by'
const attachmentBucket = 'work-order-attachments'

function notifyUnreadWorkOrderCountInvalidated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workbench:unread-work-order-count-invalidated'))
  }
}

async function loadWorkOrderRelations(orders, { signAttachmentUrls = true } = {}) {
  if (!orders.length) return orders
  const workOrderIds = orders.map((order) => order.id)
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id
  const readStateQuery = userId
    ? supabase.from('work_order_reads').select('work_order_id').eq('user_id', userId).in('work_order_id', workOrderIds)
    : Promise.resolve({ data: [], error: null })
  const [{ data: assignments, error: assignmentsError }, { data: attachments, error: attachmentsError }, { data: readStates, error: readStatesError }] = await Promise.all([
    supabase.from('work_order_assignments').select('id, work_order_id, user_id, team_id').in('work_order_id', workOrderIds),
    supabase.from('work_order_attachments').select('id, work_order_id, kind, storage_path, file_name, content_type, byte_size, is_thumbnail, created_at').in('work_order_id', workOrderIds),
    readStateQuery,
  ])
  if (assignmentsError) throw assignmentsError
  if (attachmentsError) throw attachmentsError
  if (readStatesError) throw readStatesError
  const readWorkOrderIds = new Set((readStates ?? []).map((readState) => readState.work_order_id))
  const assignmentsByWorkOrder = new Map()
  const attachmentsByWorkOrder = new Map()
  for (const assignment of assignments ?? []) {
    const rows = assignmentsByWorkOrder.get(assignment.work_order_id) ?? []
    rows.push(assignment)
    assignmentsByWorkOrder.set(assignment.work_order_id, rows)
  }
  for (const attachment of attachments ?? []) {
    const rows = attachmentsByWorkOrder.get(attachment.work_order_id) ?? []
    rows.push(attachment)
    attachmentsByWorkOrder.set(attachment.work_order_id, rows)
  }
  const ordersWithRelations = orders.map((order) => ({
    ...order,
    is_read: readWorkOrderIds.has(order.id),
    work_order_assignments: assignmentsByWorkOrder.get(order.id) ?? [],
    work_order_attachments: (attachmentsByWorkOrder.get(order.id) ?? []).map((attachment) => ({ ...attachment, signed_url: null })),
  }))
  return signAttachmentUrls ? signWorkOrderAttachmentUrls(ordersWithRelations) : ordersWithRelations
}

export async function signWorkOrderAttachmentUrls(orders) {
  const storagePaths = orders.flatMap((order) => (order.work_order_attachments ?? []).map((attachment) => attachment.storage_path))
  if (!storagePaths.length) return orders
  const { data: signedFiles, error: signedError } = await supabase.storage.from(attachmentBucket).createSignedUrls(storagePaths, 60 * 60)
  if (signedError) throw signedError
  const signedByPath = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]))
  return orders.map((order) => ({
    ...order,
    work_order_attachments: (order.work_order_attachments ?? []).map((attachment) => ({ ...attachment, signed_url: signedByPath.get(attachment.storage_path) ?? null })),
  }))
}

export async function listWorkOrderInboxCounts({ organizationId, tab, search, filters = [], grants }) {
  assertPermission(grants, 'work_orders.view')
  const { data, error } = await supabase.rpc('get_work_order_inbox_counts', {
    target_organization_id: organizationId,
    target_tab: tab,
    target_search: search?.trim() || null,
    target_filters: normalizeWorkOrderFilters(filters),
  })
  if (error) throw error
  return data ?? {}
}

export async function listWorkOrderCalendarDates({ organizationId, startDate, endDate, grants }) {
  assertPermission(grants, 'work_orders.view')
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('work_orders')
      .select('due_date, status')
      .eq('organization_id', organizationId)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('due_date')
      .range(offset, offset + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if ((data ?? []).length < 1000) return rows
  }
}

export async function listWorkOrderCalendarDay({ organizationId, date, grants }) {
  assertPermission(grants, 'work_orders.view')
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('work_orders')
      .select(workOrderFields)
      .eq('organization_id', organizationId)
      .eq('due_date', date)
      .order('due_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if ((data ?? []).length < 1000) return loadWorkOrderRelations(rows)
  }
}

export async function getUnreadWorkOrderCount({ organizationId, grants }) {
  assertPermission(grants, 'work_orders.view')
  const { data, error } = await supabase.rpc('get_unread_work_order_count', {
    target_organization_id: organizationId,
  })
  if (error) throw error
  return Number(data ?? 0)
}

export async function markWorkOrderRead({ workOrderId, grants }) {
  assertPermission(grants, 'work_orders.view')
  const { error } = await supabase.rpc('mark_work_order_read', { target_work_order_id: workOrderId })
  if (error) throw error
  notifyUnreadWorkOrderCountInvalidated()
}

export async function markWorkOrderUnread({ workOrderId, grants }) {
  assertPermission(grants, 'work_orders.view')
  const { error } = await supabase.rpc('mark_work_order_unread', { target_work_order_id: workOrderId })
  if (error) throw error
  notifyUnreadWorkOrderCountInvalidated()
}

export async function markWorkOrderInboxRead({ organizationId, tab, search, filters = [], grants }) {
  assertPermission(grants, 'work_orders.view')
  const { data, error } = await supabase.rpc('mark_work_order_inbox_read', {
    target_organization_id: organizationId,
    target_tab: tab,
    target_search: search?.trim() || null,
    target_filters: normalizeWorkOrderFilters(filters),
  })
  if (error) throw error
  notifyUnreadWorkOrderCountInvalidated()
  return data ?? 0
}

export async function listWorkOrderInboxPage({ organizationId, tab, group, search, sort, unreadFirst = false, offset, pageSize = 50, filters = [], includeRelations = true, grants }) {
  assertPermission(grants, 'work_orders.view')
  const { data, error } = await supabase.rpc('get_work_order_inbox_page', {
    target_organization_id: organizationId,
    target_tab: tab,
    target_group: group,
    target_search: search?.trim() || null,
    target_sort: sort,
    target_unread_first: unreadFirst,
    target_offset: offset,
    target_page_size: pageSize,
    target_filters: normalizeWorkOrderFilters(filters),
  })
  if (error) throw error
  const workOrders = data ?? []
  return includeRelations ? loadWorkOrderRelations(workOrders, { signAttachmentUrls: false }) : workOrders
}

export async function getWorkOrderById({ organizationId, workOrderId, grants }) {
  assertPermission(grants, 'work_orders.view')
  const { data, error } = await supabase
    .from('work_orders')
    .select(workOrderFields)
    .eq('organization_id', organizationId)
    .eq('id', workOrderId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return (await loadWorkOrderRelations([data]))[0]
}

export async function createWorkOrder({ organizationId, title, description, priority, dueDate, dueTime, startDate, estimatedDurationMinutes, workType = 'reactive', assignments = [], pictures = [], thumbnail = null, files = [], grants }) {
  assertPermission(grants, 'work_orders.create')
  if (assignments.length) assertPermission(grants, 'work_orders.assign')
  if (!title?.trim()) throw new Error('A Work Order title is required.')
  if (!['Low', 'Medium', 'High', 'Urgent'].includes(priority) && priority !== null) throw new Error('Choose a valid Work Order priority.')
  if (!['reactive', 'preventive'].includes(workType)) throw new Error('Choose a valid Work Type.')
  if (estimatedDurationMinutes != null && (!Number.isInteger(estimatedDurationMinutes) || estimatedDurationMinutes <= 0)) throw new Error('Estimated time must be greater than zero minutes.')
  const filesToUpload = [
    ...pictures.map((file) => ({ file, kind: 'image', isThumbnail: file === thumbnail })),
    ...files.map((file) => ({ file, kind: 'file', isThumbnail: false })),
  ]
  for (const { file } of filesToUpload) {
    if (!file.size || file.size > WORK_ORDER_ATTACHMENT_MAX_BYTES) throw new Error(`${file.name} must be between 1 byte and 10 MB.`)
    if (file.name.length > 255) throw new Error(`${file.name} has a filename longer than 255 characters.`)
  }
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('You must be signed in to create a Work Order.')
  const workOrderId = crypto.randomUUID()
  const uploadedObjects = []
  const attachmentRecords = []
  let createdWorkOrder
  try {
    for (const { file, kind, isThumbnail } of filesToUpload) {
      const attachmentId = crypto.randomUUID()
      const storagePath = `${organizationId}/${authData.user.id}/${workOrderId}/${attachmentId}${getSafeAttachmentExtension(file.name)}`
      const { error: uploadError } = await supabase.storage.from(attachmentBucket).upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
      if (uploadError) throw uploadError
      uploadedObjects.push(storagePath)
      attachmentRecords.push({
        id: attachmentId,
        kind,
        storage_path: storagePath,
        file_name: file.name,
        content_type: file.type || 'application/octet-stream',
        byte_size: file.size,
        is_thumbnail: isThumbnail,
      })
    }

    const { data, error } = await supabase.rpc('create_work_order_with_assignments', {
      target_work_order_id: workOrderId,
      target_organization_id: organizationId,
      target_title: title.trim(),
      target_description: description?.trim() || null,
      target_priority: priority ?? null,
      target_due_date: dueDate ?? null,
      target_due_time: dueTime ?? null,
      target_start_date: startDate ?? null,
      target_estimated_duration_minutes: estimatedDurationMinutes ?? null,
      target_work_type: workType,
      target_assignments: assignments.map(({ userId, teamId }) => ({ user_id: userId ?? null, team_id: teamId ?? null })),
      target_attachments: attachmentRecords,
    })
    if (error) throw error
    createdWorkOrder = {
      ...data,
      work_order_assignments: assignments.map(({ userId, teamId }) => ({ user_id: userId ?? null, team_id: teamId ?? null })),
      work_order_attachments: attachmentRecords,
    }
  } catch (error) {
    if (uploadedObjects.length) await supabase.storage.from(attachmentBucket).remove(uploadedObjects).catch(() => {})
    throw error
  }
  if (attachmentRecords.length) {
    const { data: signedFiles, error: signedError } = await supabase.storage.from(attachmentBucket).createSignedUrls(
      attachmentRecords.map((attachment) => attachment.storage_path),
      60 * 60,
    )
    if (!signedError) {
      const signedByPath = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]))
      createdWorkOrder.work_order_attachments = attachmentRecords.map((attachment) => ({
        ...attachment,
        signed_url: signedByPath.get(attachment.storage_path) ?? null,
      }))
    }
  }
  notifyUnreadWorkOrderCountInvalidated()
  return createdWorkOrder
}

export async function updateWorkOrderDetails({ organizationId, workOrderId, title, description, priority, dueDate, dueTime, startDate, estimatedDurationMinutes, workType = 'reactive', assignments = null, pictures = [], files = [], retainedAttachmentIds = [], thumbnailAttachmentId = null, thumbnail = null, grants, record }) {
  assertPermission(grants, 'work_orders.edit', record)
  if (assignments !== null) assertPermission(grants, 'work_orders.assign')
  if (!title?.trim()) throw new Error('A Work Order title is required.')
  if (!['Low', 'Medium', 'High', 'Urgent'].includes(priority) && priority !== null) throw new Error('Choose a valid Work Order priority.')
  if (!['reactive', 'preventive'].includes(workType)) throw new Error('Choose a valid Work Type.')
  if (estimatedDurationMinutes != null && (!Number.isInteger(estimatedDurationMinutes) || estimatedDurationMinutes <= 0)) throw new Error('Estimated time must be greater than zero minutes.')

  const filesToUpload = [
    ...pictures.map((file) => ({ file, kind: 'image', isThumbnail: file === thumbnail })),
    ...files.map((file) => ({ file, kind: 'file' })),
  ]
  for (const { file } of filesToUpload) {
    if (!file.size || file.size > WORK_ORDER_ATTACHMENT_MAX_BYTES) throw new Error(`${file.name} must be between 1 byte and 10 MB.`)
    if (file.name.length > 255) throw new Error(`${file.name} has a filename longer than 255 characters.`)
  }

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('You must be signed in to edit a Work Order.')

  const uploadedObjects = []
  const attachmentRecords = []
  let updatedWorkOrder
  try {
    for (const { file, kind, isThumbnail = false } of filesToUpload) {
      const attachmentId = crypto.randomUUID()
      const storagePath = `${organizationId}/${authData.user.id}/${workOrderId}/${attachmentId}${getSafeAttachmentExtension(file.name)}`
      const { error: uploadError } = await supabase.storage.from(attachmentBucket).upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
      if (uploadError) throw uploadError
      uploadedObjects.push(storagePath)
      attachmentRecords.push({
        id: attachmentId,
        kind,
        storage_path: storagePath,
        file_name: file.name,
        content_type: file.type || 'application/octet-stream',
        byte_size: file.size,
        is_thumbnail: isThumbnail,
      })
    }

    const targetAttachmentState = [
      ...retainedAttachmentIds.map((id) => ({
        id,
        existing: true,
        is_thumbnail: id === thumbnailAttachmentId,
      })),
      ...attachmentRecords.map((attachment) => ({ ...attachment, existing: false })),
    ]
    const { data, error } = await supabase.rpc('update_work_order_with_attachment_state', {
      target_work_order_id: workOrderId,
      target_organization_id: organizationId,
      target_title: title.trim(),
      target_description: description?.trim() || null,
      target_priority: priority ?? null,
      target_due_date: dueDate ?? null,
      target_due_time: dueTime ?? null,
      target_start_date: startDate ?? null,
      target_estimated_duration_minutes: estimatedDurationMinutes ?? null,
      target_work_type: workType,
      target_assignments: assignments === null ? null : assignments.map(({ userId, teamId }) => ({ user_id: userId ?? null, team_id: teamId ?? null })),
      target_attachments: [],
      target_attachment_state: targetAttachmentState,
    })
    if (error) throw error
    updatedWorkOrder = data
  } catch (error) {
    if (uploadedObjects.length) await supabase.storage.from(attachmentBucket).remove(uploadedObjects).catch(() => {})
    throw error
  }

  const removedAttachmentPaths = updatedWorkOrder.removed_attachment_paths ?? []
  delete updatedWorkOrder.removed_attachment_paths
  if (removedAttachmentPaths.length) {
    const { error: cleanupError } = await supabase.storage.from(attachmentBucket).remove(removedAttachmentPaths)
    if (cleanupError) console.warn('Work Order attachment objects could not all be removed.', cleanupError)
  }

  const [hydratedWorkOrder] = await loadWorkOrderRelations([updatedWorkOrder])
  notifyUnreadWorkOrderCountInvalidated()
  return hydratedWorkOrder
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
  return (await loadWorkOrderRelations([data]))[0]
}

export async function updateWorkOrderExecution({ organizationId, workOrderId, status, procedureProgress, grants, record }) {
  const updates = {}
  if (status !== undefined) updates.status = status
  if (procedureProgress !== undefined) updates.procedure_progress = procedureProgress
  const permissionKey = status !== undefined ? 'work_orders.change_status' : 'work_orders.fill_procedure'
  return updateWorkOrder({ organizationId, workOrderId, updates, grants, permissionKey, record })
}
