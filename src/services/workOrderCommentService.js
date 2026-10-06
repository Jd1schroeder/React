import { supabase } from '../lib/supabase'
import { assertPermission } from './authorizationService'
import { WORK_ORDER_ATTACHMENT_MAX_BYTES, getSafeAttachmentExtension } from '../utils/workOrderAttachments'

const commentAttachmentBucket = 'work-order-comment-attachments'
const activityPageSize = 50
const maximumCommentAttachments = 20

function applyActivityCursor(query, before) {
  if (!before?.created_at || !before?.id) return query
  return query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`)
}

function compareActivityItems(first, second) {
  const timeDifference = new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
  if (timeDifference !== 0) return timeDifference
  return second.id.localeCompare(first.id)
}

export async function listWorkOrderActivity({ organizationId, workOrderId, grants, record, before = null }) {
  assertPermission(grants, 'work_orders.view_comments', record)
  const pageSize = activityPageSize
  const [activityResult, commentsResult] = await Promise.all([
    applyActivityCursor(
      supabase.from('work_order_activity')
        .select('id, work_order_id, actor_id, event_type, details, created_at')
        .eq('organization_id', organizationId)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize + 1),
      before,
    ),
    applyActivityCursor(
      supabase.from('work_order_comments')
        .select('id, work_order_id, author_id, body, created_at, edited_at, deleted_at, deleted_by')
        .eq('organization_id', organizationId)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize + 1),
      before,
    ),
  ])
  if (activityResult.error) throw activityResult.error
  if (commentsResult.error) throw commentsResult.error

  const items = [
    ...(activityResult.data ?? []).map((item) => ({ ...item, kind: 'activity' })),
    ...(commentsResult.data ?? []).map((item) => ({ ...item, kind: 'comment' })),
  ].sort(compareActivityItems)
  const page = items.slice(0, pageSize)
  const commentIds = page.filter((item) => item.kind === 'comment' && !item.deleted_at).map((item) => item.id)
  let attachmentsByComment = new Map()
  if (commentIds.length) {
    const { data: attachments, error: attachmentsError } = await supabase
      .from('work_order_comment_attachments')
      .select('id, comment_id, kind, storage_path, file_name, content_type, byte_size, created_at')
      .in('comment_id', commentIds)
      .order('created_at', { ascending: true })
    if (attachmentsError) throw attachmentsError

    const paths = (attachments ?? []).map((attachment) => attachment.storage_path)
    const { data: signedFiles, error: signedError } = paths.length
      ? await supabase.storage.from(commentAttachmentBucket).createSignedUrls(paths, 60 * 60)
      : { data: [], error: null }
    if (signedError) throw signedError
    const signedByPath = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]))
    attachmentsByComment = new Map()
    for (const attachment of attachments ?? []) {
      const commentAttachments = attachmentsByComment.get(attachment.comment_id) ?? []
      commentAttachments.push({ ...attachment, signed_url: signedByPath.get(attachment.storage_path) ?? null })
      attachmentsByComment.set(attachment.comment_id, commentAttachments)
    }
  }

  const hydratedItems = page.map((item) => item.kind === 'comment'
    ? { ...item, attachments: attachmentsByComment.get(item.id) ?? [] }
    : item)
  const lastItem = hydratedItems.at(-1)
  return {
    items: hydratedItems,
    hasMore: items.length > pageSize,
    nextCursor: lastItem ? { created_at: lastItem.created_at, id: lastItem.id } : null,
  }
}

export async function createWorkOrderComment({ organizationId, workOrderId, body, files = [], grants, record }) {
  assertPermission(grants, 'work_orders.post_comments', record)
  const normalizedBody = body?.trim() || ''
  if (normalizedBody.length > 10000) throw new Error('Comments cannot be longer than 10,000 characters.')
  if (!normalizedBody && files.length === 0) throw new Error('Write a comment or attach a file before sending.')
  if (files.length > maximumCommentAttachments) throw new Error(`Attach up to ${maximumCommentAttachments} files per comment.`)
  for (const file of files) {
    if (!file.size || file.size > WORK_ORDER_ATTACHMENT_MAX_BYTES) throw new Error(`${file.name} must be between 1 byte and 10 MB.`)
    if (file.name.length > 255) throw new Error(`${file.name} has a filename longer than 255 characters.`)
  }

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('You must be signed in to comment on a Work Order.')

  const commentId = crypto.randomUUID()
  const uploadedPaths = []
  const attachments = []
  try {
    for (const file of files) {
      const attachmentId = crypto.randomUUID()
      const storagePath = `${organizationId}/${authData.user.id}/${workOrderId}/${commentId}/${attachmentId}${getSafeAttachmentExtension(file.name)}`
      const contentType = file.type || 'application/octet-stream'
      const { error: uploadError } = await supabase.storage.from(commentAttachmentBucket).upload(storagePath, file, {
        cacheControl: '3600',
        contentType,
        upsert: false,
      })
      if (uploadError) throw uploadError
      uploadedPaths.push(storagePath)
      attachments.push({
        id: attachmentId,
        kind: contentType.startsWith('image/') ? 'image' : 'file',
        storage_path: storagePath,
        file_name: file.name,
        content_type: contentType,
        byte_size: file.size,
      })
    }

    const { data, error } = await supabase.rpc('create_work_order_comment', {
      target_organization_id: organizationId,
      target_work_order_id: workOrderId,
      target_comment_id: commentId,
      target_body: normalizedBody || null,
      target_attachments: attachments,
    })
    if (error) throw error
    return data
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(commentAttachmentBucket).remove(uploadedPaths).catch(() => {})
    }
    throw error
  }
}

export async function updateWorkOrderComment({ organizationId, workOrderId, commentId, authorId, body, grants, record }) {
  assertPermission(grants, 'work_orders.post_comments', record)
  if (!record?.userId || authorId !== record.userId) throw new Error('You can only edit your own comments.')
  const normalizedBody = body?.trim() || ''
  if (normalizedBody.length > 10000) throw new Error('Comments cannot be longer than 10,000 characters.')

  const { data, error } = await supabase.rpc('update_work_order_comment', {
    target_organization_id: organizationId,
    target_work_order_id: workOrderId,
    target_comment_id: commentId,
    target_body: normalizedBody || null,
  })
  if (error) throw error
  return data
}

export async function deleteWorkOrderComment({ organizationId, workOrderId, commentId, authorId, grants, record, canDeleteAny = false }) {
  if (!canDeleteAny) {
    if (!record?.userId || authorId !== record.userId) throw new Error('You can only delete your own comments.')
    assertPermission(grants, 'work_orders.post_comments', record)
  }

  const { data, error } = await supabase.rpc('delete_work_order_comment', {
    target_organization_id: organizationId,
    target_work_order_id: workOrderId,
    target_comment_id: commentId,
  })
  if (error) throw error

  const paths = data?.attachment_paths ?? []
  if (!paths.length) return { deletedAt: data?.deleted_at, cleanupPending: false }
  const { error: cleanupError } = await supabase.storage.from(commentAttachmentBucket).remove(paths)
  return { deletedAt: data?.deleted_at, cleanupPending: Boolean(cleanupError) }
}

export async function getWorkOrderLinkPreviews({ organizationId, workOrderIds, grants }) {
  assertPermission(grants, 'work_orders.view')
  const ids = [...new Set(workOrderIds)].slice(0, 50)
  if (!organizationId || !ids.length) return {}

  const { data: workOrders, error: workOrdersError } = await supabase
    .from('work_orders')
    .select('id, work_order_number, title, status, priority')
    .eq('organization_id', organizationId)
    .in('id', ids)
  if (workOrdersError) throw workOrdersError
  const accessibleIds = (workOrders ?? []).map((workOrder) => workOrder.id)
  if (!accessibleIds.length) return {}

  const { data: thumbnails, error: thumbnailsError } = await supabase
    .from('work_order_attachments')
    .select('work_order_id, storage_path')
    .eq('kind', 'image')
    .eq('is_thumbnail', true)
    .in('work_order_id', accessibleIds)
  if (thumbnailsError) throw thumbnailsError

  const paths = (thumbnails ?? []).map((thumbnail) => thumbnail.storage_path)
  const { data: signedFiles, error: signedError } = paths.length
    ? await supabase.storage.from('work-order-attachments').createSignedUrls(paths, 60 * 60)
    : { data: [], error: null }
  if (signedError) throw signedError
  const signedByPath = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]))
  const thumbnailByOrder = new Map((thumbnails ?? []).map((thumbnail) => [
    thumbnail.work_order_id,
    signedByPath.get(thumbnail.storage_path) ?? null,
  ]))
  return Object.fromEntries((workOrders ?? []).map((workOrder) => [
    workOrder.id,
    { ...workOrder, thumbnail_url: thumbnailByOrder.get(workOrder.id) ?? null },
  ]))
}
