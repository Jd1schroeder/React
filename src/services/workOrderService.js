import { supabase } from '../lib/supabase'
import { assertPermission } from './authorizationService'
import { WORK_ORDER_ATTACHMENT_MAX_BYTES, getSafeAttachmentExtension } from '../utils/workOrderAttachments'

const workOrderFields = 'id, organization_id, title, description, status, priority, procedure_progress, due_at, due_date, due_time, start_date, estimated_duration_minutes, work_type, requester_id, assigned_to, team_id, created_by, created_at, updated_at, updated_by'
const attachmentBucket = 'work-order-attachments'

async function loadWorkOrderRelations(orders) {
  if (!orders.length) return orders
  const workOrderIds = orders.map((order) => order.id)
  const [{ data: assignments, error: assignmentsError }, { data: attachments, error: attachmentsError }] = await Promise.all([
    supabase.from('work_order_assignments').select('id, work_order_id, user_id, team_id').in('work_order_id', workOrderIds),
    supabase.from('work_order_attachments').select('id, work_order_id, kind, storage_path, file_name, content_type, byte_size, is_thumbnail, created_at').in('work_order_id', workOrderIds),
  ])
  if (assignmentsError) throw assignmentsError
  if (attachmentsError) throw attachmentsError
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
    work_order_assignments: assignmentsByWorkOrder.get(order.id) ?? [],
    work_order_attachments: attachmentsByWorkOrder.get(order.id) ?? [],
  }))
  const storagePaths = ordersWithRelations.flatMap((order) => order.work_order_attachments.map((attachment) => attachment.storage_path))
  if (!storagePaths.length) return ordersWithRelations
  const { data: signedFiles, error: signedError } = await supabase.storage.from(attachmentBucket).createSignedUrls(storagePaths, 60 * 60)
  if (signedError) throw signedError
  const signedByPath = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]))
  return ordersWithRelations.map((order) => ({
    ...order,
    work_order_attachments: order.work_order_attachments.map((attachment) => ({ ...attachment, signed_url: signedByPath.get(attachment.storage_path) ?? null })),
  }))
}

export async function listWorkOrders(organizationId, grants) {
  assertPermission(grants, 'work_orders.view')
  const { data, error } = await supabase
    .from('work_orders')
    .select(workOrderFields)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return loadWorkOrderRelations(data ?? [])
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
  return createdWorkOrder
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
