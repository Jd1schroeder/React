import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Camera, Check, ClipboardList, FileText, Paperclip, Pencil, Send, Trash2, X } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { MobileActionSheet } from '../../components/ui/MobileActionSheet'
import { PriorityBadge } from '../../components/ui/PriorityBadge'
import { getRecordPath } from '../../routes'
import { formatCalendarDateForUser, formatDateForUser } from '../../utils/dateFormatting'
import { WORK_ORDER_ATTACHMENT_MAX_BYTES } from '../../utils/workOrderAttachments'
import { extractWorkbenchWorkOrderLinks } from '../../utils/workOrderLinks'
import { getWorkOrderMentionSuggestions, resolveWorkOrderMentionTargets } from '../../utils/workOrderMentions'
import { formatCompactDuration } from '../../utils/workOrderTimeFormatting'
import './WorkOrderActivity.css'

const maxCommentAttachments = 20
const maxDescriptionAuditExcerptLength = 120

function chronologicalActivityPage(items = []) {
  return [...items].sort((first, second) => {
    const timeDifference = new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
    if (timeDifference !== 0) return timeDifference
    return String(first.id).localeCompare(String(second.id))
  })
}

function activityTimestamp(value, dateFormat, timezone) {
  if (!value) return ''
  const date = formatDateForUser(value, dateFormat, timezone)
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value))
  return `${date}, ${time}`
}

function formatAuditValue(value) {
  if (value == null || value === '') return 'None'
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatAuditTime(value) {
  const match = typeof value === 'string' ? value.match(/^(\d{1,2}):(\d{2})/) : null
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}

function formatDueDateTime(value, dateFormat) {
  if (value == null) return 'No date or time'
  if (typeof value !== 'object') {
    return value === 'None' ? 'No date or time' : formatCalendarDateForUser(value, dateFormat)
  }
  if (!value.date && !value.time) return 'No date or time'
  const date = value.date ? formatCalendarDateForUser(value.date, dateFormat) : 'No date'
  const time = formatAuditTime(value.time)
  return time ? `${date} at ${time}` : date
}

function assignmentName(value, identitiesById, assigneeOptionsByValue) {
  if (!value) return 'No assignment'
  const user = value.user_id && identitiesById.get(value.user_id)
  if (user) return user.name || 'Assigned user'
  const team = value.team_id && assigneeOptionsByValue.get(`team:${value.team_id}`)
  if (team) return team.label
  if (value.user_id) return 'Assigned user'
  if (value.team_id) return 'Assigned team'
  return 'No assignment'
}

function normalizeMentionToken(value) {
  return String(value ?? '').toLocaleLowerCase().replace(/[^a-z0-9]/gu, '')
}

function findMentionTarget(value, mentionTargets = []) {
  const targetKey = value?.user_id
    ? `user:${value.user_id}`
    : value?.team_id
      ? `team:${value.team_id}`
      : null
  if (!targetKey) return null
  return mentionTargets.find((target) => `${target.type}:${target.id}` === targetKey) ?? null
}

function MentionText({ text, mentionTargets = [] }) {
  const mentionPattern = /(^|[\s(])(@[a-z0-9][a-z0-9._-]*)/giu
  const parts = []
  let cursor = 0
  for (const match of String(text ?? '').matchAll(mentionPattern)) {
    const prefix = match[1] ?? ''
    const token = match[2]
    const tokenStart = match.index + prefix.length
    if (tokenStart > cursor) parts.push(text.slice(cursor, tokenStart))
    const target = mentionTargets.find((candidate) => (candidate.aliases ?? []).some((alias) => normalizeMentionToken(alias) === normalizeMentionToken(token.slice(1))))
    parts.push(target
      ? <span key={`mention-${tokenStart}`} className="work-order-mention">{token}</span>
      : token)
    cursor = tokenStart + token.length
  }
  if (cursor < String(text ?? '').length) parts.push(String(text ?? '').slice(cursor))
  return parts
}

function mentionOnlyTargetKeys(body, mentionTargets = []) {
  const normalizedBody = String(body ?? '').trim()
  if (!/^@[a-z0-9][a-z0-9._-]*(?:\s+@[a-z0-9][a-z0-9._-]*)*$/iu.test(normalizedBody)) return []
  const targets = [...normalizedBody.matchAll(/@[a-z0-9][a-z0-9._-]*/giu)]
    .map((match) => mentionTargets.find((target) => (target.aliases ?? []).some((alias) => normalizeMentionToken(alias) === normalizeMentionToken(match[0].slice(1)))))
  return targets.some((target) => !target) ? [] : targets.map((target) => `${target.type}:${target.id}`)
}

function isAssignmentMentionComment(item, items, mentionTargets) {
  if (item.kind !== 'comment' || item.deleted_at || item.attachments?.length) return false
  const targetKeys = mentionOnlyTargetKeys(item.body, mentionTargets)
  if (!targetKeys.length) return false
  const targetKeySet = new Set(targetKeys)
  const commentTime = new Date(item.created_at).getTime()
  const matchingActivities = items.filter((candidate) => {
    if (candidate.kind !== 'activity' || candidate.actor_id !== item.author_id || !Number.isFinite(commentTime)) return false
    const activityTime = new Date(candidate.created_at).getTime()
    if (!Number.isFinite(activityTime) || Math.abs(activityTime - commentTime) > 10000) return false
    return (candidate.details?.changes ?? []).some((change) => {
      if (change.field !== 'assignment') return false
      const targetKey = change.to?.user_id
        ? `user:${change.to.user_id}`
        : change.to?.team_id
          ? `team:${change.to.team_id}`
          : null
      return targetKey && targetKeySet.has(targetKey)
    })
  })
  return targetKeys.every((targetKey) => matchingActivities.some((candidate) => (candidate.details?.changes ?? []).some((change) => {
    const changeTargetKey = change.to?.user_id
      ? `user:${change.to.user_id}`
      : change.to?.team_id
        ? `team:${change.to.team_id}`
        : null
    return change.field === 'assignment' && changeTargetKey === targetKey
  })))
}

function attachmentChangeDescription(change) {
  const before = Array.isArray(change.from) ? change.from : []
  const after = Array.isArray(change.to) ? change.to : []
  const beforeById = new Map(before.map((attachment) => [attachment.id, attachment]))
  const afterById = new Map(after.map((attachment) => [attachment.id, attachment]))
  const added = after.filter((attachment) => !beforeById.has(attachment.id))
  const removed = before.filter((attachment) => !afterById.has(attachment.id))
  const beforeThumbnail = before.find((attachment) => attachment.is_thumbnail)
  const afterThumbnail = after.find((attachment) => attachment.is_thumbnail)
  const messages = []

  if (added.length) messages.push(`Added ${added.map((attachment) => `“${attachment.file_name}”`).join(', ')}.`)
  if (removed.length) messages.push(`Removed ${removed.map((attachment) => `“${attachment.file_name}”`).join(', ')}.`)
  if (beforeThumbnail?.id !== afterThumbnail?.id) {
    messages.push(`Changed the thumbnail from “${beforeThumbnail?.file_name ?? 'None'}” to “${afterThumbnail?.file_name ?? 'None'}”.`)
  }
  return messages.join(' ') || 'Updated Work Order attachments.'
}

function changeDescription(change, dateFormat, identitiesById, assigneeOptionsByValue, mentionTargets) {
  const labels = {
    title: 'title',
    description: 'description',
    priority: 'priority',
    due_date: 'due date',
    start_date: 'start date',
    estimated_duration_minutes: 'estimated time',
    work_type: 'work type',
    requester_id: 'requester',
    procedure_progress: 'procedure progress',
    assignment: 'assignment',
    attachments: 'attachments',
  }
  const label = labels[change.field] ?? (change.field ?? 'Work Order field').replaceAll('_', ' ')
  if (!Object.hasOwn(change, 'from') && !Object.hasOwn(change, 'to')) return `Updated the ${label}.`
  if (change.field === 'title' || change.field === 'priority' || change.field === 'work_type') {
    return `Changed ${label} from “${change.from ?? 'None'}” to “${change.to ?? 'None'}”.`
  }
  if (change.field === 'due_date') {
    if (change.from == null && change.to == null) return 'Changed the due date or time.'
    return `Changed the due date/time from ${formatDueDateTime(change.from, dateFormat)} to ${formatDueDateTime(change.to, dateFormat)}.`
  }
  if (change.field === 'start_date') {
    if (change.from == null && change.to == null) return `Changed the ${label}.`
    const formatDate = (value) => value && value !== 'None'
      ? formatCalendarDateForUser(value, dateFormat)
      : 'No date'
    return `Changed the ${label} from ${formatDate(change.from)} to ${formatDate(change.to)}.`
  }
  if (change.field === 'estimated_duration_minutes') {
    const formatMinutes = (value) => {
      if (value == null) return 'None'
      const hours = Math.floor(value / 60)
      const minutes = value % 60
      return [hours ? `${hours} hr${hours === 1 ? '' : 's'}` : '', minutes ? `${minutes} min` : ''].filter(Boolean).join(' ') || '0 min'
    }
    return `Changed ${label} from ${formatMinutes(change.from)} to ${formatMinutes(change.to)}.`
  }
  if (change.field === 'procedure_progress') return `Changed ${label} from ${formatAuditValue(change.from)}% to ${formatAuditValue(change.to)}%.`
  if (change.field === 'requester_id') {
    const before = identitiesById.get(change.from)?.name ?? (change.from ? 'Former member' : 'None')
    const after = identitiesById.get(change.to)?.name ?? (change.to ? 'Former member' : 'None')
    return `Changed requester from “${before}” to “${after}”.`
  }
  if (change.field === 'assignment') {
    const target = findMentionTarget(change.to, mentionTargets)
    return <>{`Changed assignment from “${assignmentName(change.from, identitiesById, assigneeOptionsByValue)}” to “`}{target ? <span className="work-order-mention">@{target.mention}</span> : assignmentName(change.to, identitiesById, assigneeOptionsByValue)}”.</>
  }
  if (change.field === 'attachments') return attachmentChangeDescription(change)
  return `Changed ${label} from “${formatAuditValue(change.from)}” to “${formatAuditValue(change.to)}”.`
}

function normalizedDescription(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim()
}

function descriptionExcerpt(value) {
  const text = normalizedDescription(value)
  if (!text) return 'empty'
  const excerpt = text.length > maxDescriptionAuditExcerptLength
    ? `${text.slice(0, maxDescriptionAuditExcerptLength).trimEnd()}…`
    : text
  return `“${excerpt}”`
}

function DescriptionChange({ change }) {
  const before = String(change.from ?? '')
  const after = String(change.to ?? '')
  const summary = `Changed the description from ${descriptionExcerpt(before)} to ${descriptionExcerpt(after)}.`
  const hasLongValue = [before, after].some((value) => normalizedDescription(value).length > maxDescriptionAuditExcerptLength)

  if (!hasLongValue) return <p className="work-order-activity-description">{summary}</p>
  return (
    <details className="work-order-activity-description-change">
      <summary className="work-order-activity-description">{summary}</summary>
      <div className="work-order-activity-description-values">
        <p><strong>Before:</strong> {before || 'Empty'}</p>
        <p><strong>After:</strong> {after || 'Empty'}</p>
      </div>
    </details>
  )
}

function describeActivity(item, dateFormat, identitiesById, assigneeOptionsByValue, mentionTargets) {
  if (item.event_type === 'work_order_created') return 'Created the Work Order.'
  if (item.event_type === 'status_changed') {
    const status = item.details?.to ?? 'unknown'
    return status === 'Completed' ? 'Completed the Work Order.' : `Changed status to "${status}".`
  }
  if (item.event_type === 'external_completion_requested') {
    return item.details?.externalName
      ? `Requested completion from ${item.details.externalName}.`
      : 'Requested completion from an external contact.'
  }
  if (item.event_type === 'work_order_time_added') {
    const duration = Number(item.details?.duration_seconds ?? 0)
    return duration > 0 ? `Logged ${formatCompactDuration(duration)} of work.` : 'Started work timer.'
  }
  if (item.event_type === 'work_order_time_updated') {
    const duration = Number(item.details?.to_seconds ?? 0)
    return `Updated logged time to ${formatCompactDuration(duration)}.`
  }
  if (item.event_type === 'work_order_time_deleted') return `Removed ${formatCompactDuration(item.details?.duration_seconds)} of logged work.`
  if (item.event_type === 'work_order_cost_added') return `Added a $${Number(item.details?.amount ?? 0).toFixed(2)} cost.`
  if (item.event_type === 'work_order_cost_updated') return `Updated cost to $${Number(item.details?.to_amount ?? 0).toFixed(2)}.`
  if (item.event_type === 'work_order_cost_deleted') return `Removed a $${Number(item.details?.amount ?? 0).toFixed(2)} cost.`
  if (item.event_type === 'work_order_updated') {
    return (item.details?.changes ?? []).map((change) => changeDescription(change, dateFormat, identitiesById, assigneeOptionsByValue, mentionTargets)).join(' ')
  }
  return 'Updated work order.'
}

function ActivityDescription({ item, dateFormat, identitiesById, assigneeOptionsByValue, mentionTargets }) {
  const changes = item.event_type === 'work_order_updated' ? item.details?.changes : null
  if (!Array.isArray(changes) || changes.length === 0) {
    return <p className="work-order-activity-description">{describeActivity(item, dateFormat, identitiesById, assigneeOptionsByValue, mentionTargets)}</p>
  }

  return (
    <div className="work-order-activity-changes">
      {changes.map((change, index) => change.field === 'description'
        && (Object.hasOwn(change, 'from') || Object.hasOwn(change, 'to'))
        ? <DescriptionChange key={`${change.field}-${index}`} change={change} />
        : <p key={`${change.field}-${index}`} className="work-order-activity-description">{changeDescription(change, dateFormat, identitiesById, assigneeOptionsByValue, mentionTargets)}</p>)}
    </div>
  )
}

function WorkOrderLinkRow({ workOrderId, preview }) {
  return (
    <RouterLink className="work-order-comment-link-row" to={getRecordPath('workorders', workOrderId)}>
      <span className="work-order-comment-link-thumbnail">
        {preview?.thumbnail_url
          ? <img src={preview.thumbnail_url} alt="" loading="lazy" />
          : <ClipboardList size={20} aria-hidden="true" />}
      </span>
      <span className="work-order-comment-link-main">
        <strong>{preview?.title || 'Work Order'}</strong>
        <span className="work-order-comment-link-meta">
          {preview?.work_order_number ? `#${preview.work_order_number}` : 'Work Order'}
          {preview?.status ? ` · ${preview.status === 'Completed' ? 'Done' : preview.status}` : ''}
        </span>
      </span>
      {preview?.priority && <PriorityBadge priority={preview.priority} />}
    </RouterLink>
  )
}

function CommentBody({ body, linkPreviews, mentionTargets }) {
  return (
    <div className="work-order-comment-body">
      {extractWorkbenchWorkOrderLinks(body).map((segment, index) => segment.type === 'work-order-link'
        ? <WorkOrderLinkRow key={`${segment.workOrderId}-${index}`} workOrderId={segment.workOrderId} preview={linkPreviews[segment.workOrderId]} />
        : <span key={`text-${index}`}><MentionText text={segment.text} mentionTargets={mentionTargets} /></span>)}
    </div>
  )
}

function CommentAttachments({ attachments = [] }) {
  if (!attachments.length) return null
  return (
    <ul className="work-order-comment-attachments" aria-label="Comment attachments">
      {attachments.map((attachment) => (
        <li key={attachment.id} className={attachment.kind === 'image' ? 'is-image' : 'is-file'}>
          {attachment.kind === 'image' && attachment.signed_url
            ? <>
                <a href={attachment.signed_url} target="_blank" rel="noreferrer" className="work-order-comment-image-link" aria-label={`Open ${attachment.file_name}`}>
                  <img src={attachment.signed_url} alt={attachment.file_name} loading="lazy" />
                </a>
                <span className="work-order-comment-image-name">{attachment.file_name}</span>
              </>
            : <a href={attachment.signed_url || undefined} target="_blank" rel="noreferrer" className="work-order-comment-attachment-link" aria-disabled={!attachment.signed_url}>
                <FileText size={18} aria-hidden="true" />
                <span>{attachment.file_name}</span>
              </a>}
        </li>
      ))}
    </ul>
  )
}

function ActivityItem({
  item,
  identitiesById,
  assigneeOptionsByValue,
  mentionTargets,
  dateFormat,
  timezone,
  linkPreviews,
  currentUserId,
  canEditOwnComments,
  canDeleteOwnComments,
  canDeleteAnyComments,
  onUpdateComment,
  onDeleteComment,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isTimeVisible, setIsTimeVisible] = useState(false)
  const [isSavingComment, setIsSavingComment] = useState(false)
  const [isDeletingComment, setIsDeletingComment] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)
  const [draft, setDraft] = useState(item.body ?? '')
  const [actionError, setActionError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const actorId = item.kind === 'comment' ? item.author_id : item.actor_id
  const actor = identitiesById.get(actorId)
  const actorName = item.kind === 'comment' && item.external_author_name
    ? item.external_author_name
    : actor?.name || (actorId ? 'Former member' : 'System')
  const actorProfilePath = actorId ? getRecordPath('users/profile', actorId) : null
  const deletedBy = identitiesById.get(item.deleted_by)
  const isLiveComment = item.kind === 'comment' && !item.deleted_at
  const isOwnComment = Boolean(currentUserId && item.author_id === currentUserId)
  const canEditComment = isLiveComment && isOwnComment && canEditOwnComments && onUpdateComment
  const canDeleteComment = isLiveComment && onDeleteComment
    && (canDeleteAnyComments || (isOwnComment && canDeleteOwnComments))
  const editedAt = item.edited_at ? activityTimestamp(item.edited_at, dateFormat, timezone) : ''
  const canUseCommentActions = item.kind === 'comment' && !isEditing && (canEditComment || canDeleteComment)
  const longPressTimerRef = useRef(null)
  const suppressNextClickRef = useRef(false)
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current == null) return
    window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
  }
  useEffect(() => () => {
    if (longPressTimerRef.current != null) window.clearTimeout(longPressTimerRef.current)
  }, [])
  const toggleCommentTime = (event) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }
    if (event.target.closest('a,button,input,textarea,select,form')) return
    setIsTimeVisible((visible) => !visible)
  }
  const handleCommentRowKeyDown = (event) => {
    if (event.target.closest('a,button,input,textarea,select,form')) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    setIsTimeVisible((visible) => !visible)
  }
  const handleCommentPointerDown = (event) => {
    if (!canUseCommentActions || event.target.closest?.('a,button,input,textarea,select,form')) return
    suppressNextClickRef.current = false
    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null
      suppressNextClickRef.current = true
      setIsActionSheetOpen(true)
    }, 500)
  }
  const handleCommentPointerUp = () => clearLongPressTimer()
  const handleCommentContextMenu = (event) => {
    if (!canUseCommentActions) return
    event.preventDefault()
  }

  const saveComment = async (event) => {
    event.preventDefault()
    if (!canEditComment || isSavingComment || draft.trim() === (item.body ?? '')) return
    setActionError('')
    setActionNotice('')
    setIsSavingComment(true)
    try {
      await onUpdateComment(item, draft)
      setIsEditing(false)
    } catch (error) {
      setActionError(error.message || 'Unable to edit this comment.')
    } finally {
      setIsSavingComment(false)
    }
  }

  const deleteComment = async () => {
    if (!canDeleteComment || isDeletingComment) return
    setActionError('')
    setActionNotice('')
    setIsDeletingComment(true)
    try {
      const result = await onDeleteComment(item)
      setIsConfirmingDelete(false)
      if (result?.cleanupPending) setActionNotice('Comment deleted; cleanup of its private attachments is pending.')
    } catch (error) {
      setActionError(error.message || 'Unable to delete this comment.')
    } finally {
      setIsDeletingComment(false)
    }
  }

  const avatar = (
    <div className="work-order-activity-user-image">
      {actorProfilePath
        ? <RouterLink
            className="work-order-activity-avatar-link"
            to={actorProfilePath}
            aria-label={`View ${actorName}'s profile`}
            title={`View ${actorName}'s profile`}
          >
            <Avatar
              className="work-order-activity-avatar"
              src={actor?.avatarUrl}
              firstName={actor?.firstName}
              lastName={actor?.lastName}
              name={actorName}
              alt=""
            />
          </RouterLink>
        : <Avatar
            className="work-order-activity-avatar"
            src={actor?.avatarUrl}
            firstName={actor?.firstName}
            lastName={actor?.lastName}
            name={actorName}
            alt=""
          />}
    </div>
  )
  const commentActions = (canEditComment || canDeleteComment) && !isEditing && (
    <span className="work-order-comment-actions">
      {canEditComment && <button type="button" onClick={() => { setActionError(''); setDraft(item.body ?? ''); setIsEditing(true); setIsConfirmingDelete(false) }} aria-label="Edit comment" title="Edit comment"><Pencil size={14} aria-hidden="true" />Edit</button>}
      {canDeleteComment && <button type="button" className="is-danger" onClick={() => { setActionError(''); setIsConfirmingDelete(true) }} aria-label="Delete comment" title="Delete comment"><Trash2 size={14} aria-hidden="true" />Delete</button>}
    </span>
  )
  const openEditComment = () => {
    setIsActionSheetOpen(false)
    setActionError('')
    setDraft(item.body ?? '')
    setIsEditing(true)
    setIsConfirmingDelete(false)
  }
  const openDeleteComment = () => {
    setIsActionSheetOpen(false)
    setActionError('')
    setIsConfirmingDelete(true)
  }
  const authorTimeRow = (
    <div className="work-order-activity-meta">
      {actorProfilePath
        ? <RouterLink className="work-order-activity-author is-link" to={actorProfilePath}>{actorName}</RouterLink>
        : <strong className="work-order-activity-author">{actorName}</strong>}
      <div className="work-order-activity-time">{activityTimestamp(item.created_at, dateFormat, timezone)}</div>
      {isLiveComment && item.edited_at && <span className="work-order-comment-edited" title={`Edited ${editedAt}`}>Edited</span>}
      {commentActions}
    </div>
  )

  return (
    <li className="work-order-activity-list-item">
      <div
        className={`work-order-activity-item${item.kind === 'comment' ? ' is-comment' : ' is-system'}${item.kind === 'comment' && isTimeVisible ? ' is-time-visible' : ''}`}
        onClick={item.kind === 'comment' ? toggleCommentTime : undefined}
        onKeyDown={item.kind === 'comment' ? handleCommentRowKeyDown : undefined}
        onPointerDown={item.kind === 'comment' ? handleCommentPointerDown : undefined}
        onPointerUp={item.kind === 'comment' ? handleCommentPointerUp : undefined}
        onPointerCancel={item.kind === 'comment' ? handleCommentPointerUp : undefined}
        onPointerLeave={item.kind === 'comment' ? handleCommentPointerUp : undefined}
        onContextMenu={item.kind === 'comment' ? handleCommentContextMenu : undefined}
        tabIndex={item.kind === 'comment' ? 0 : undefined}
        aria-expanded={item.kind === 'comment' ? isTimeVisible : undefined}
      >
        <div className="work-order-activity-row">
          {avatar}
          <div className="work-order-activity-content">
            {authorTimeRow}
            {item.kind === 'comment' ? (
              <>
                {item.deleted_at
                  ? <div className="work-order-comment-tombstone">
                      <p className="work-order-comment-deleted">This comment was deleted.</p>
                      <p className="work-order-comment-delete-meta">Deleted {activityTimestamp(item.deleted_at, dateFormat, timezone)}{item.deleted_by ? ` by ${deletedBy?.name ?? 'a former member'}` : ''}.</p>
                    </div>
                  : isEditing
                    ? <form className="work-order-comment-editor" onSubmit={saveComment}>
                        <label className="work-order-comment-sr-only" htmlFor={`edit-comment-${item.id}`}>Edit comment</label>
                        <textarea id={`edit-comment-${item.id}`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={10000} rows={3} disabled={isSavingComment} />
                        <div className="work-order-comment-editor-actions">
                          <button type="button" onClick={() => { setDraft(item.body ?? ''); setIsEditing(false); setActionError('') }} disabled={isSavingComment}>Cancel</button>
                          <button type="submit" disabled={isSavingComment || draft.trim() === (item.body ?? '')}><Check size={14} aria-hidden="true" />{isSavingComment ? 'Saving...' : 'Save'}</button>
                        </div>
                      </form>
                    : <>
                        {item.body && <CommentBody body={item.body} linkPreviews={linkPreviews} mentionTargets={mentionTargets} />}
                        <CommentAttachments attachments={item.attachments} />
                      </>}
                {isConfirmingDelete && !item.deleted_at && (
                  <div className="work-order-comment-delete-confirm" role="group" aria-label="Confirm comment deletion">
                    <span>Delete this comment?</span>
                    <button type="button" onClick={() => setIsConfirmingDelete(false)} disabled={isDeletingComment}>Cancel</button>
                    <button type="button" className="is-danger" onClick={() => void deleteComment()} disabled={isDeletingComment}><Trash2 size={14} aria-hidden="true" />{isDeletingComment ? 'Deleting...' : 'Delete'}</button>
                  </div>
                )}
                {actionNotice && <p className="work-order-comment-notice" role="status">{actionNotice}</p>}
                {actionError && <p className="work-order-comment-error" role="alert">{actionError}</p>}
              </>
            ) : (
              <div className="work-order-activity-content-inner">
                <ActivityDescription item={item} dateFormat={dateFormat} identitiesById={identitiesById} assigneeOptionsByValue={assigneeOptionsByValue} mentionTargets={mentionTargets} />
              </div>
            )}
          </div>
        </div>
      </div>
      {isActionSheetOpen && (
        <MobileActionSheet title="Comment actions" variant="menu" onClose={() => setIsActionSheetOpen(false)}>
          {canEditComment && (
            <button type="button" onClick={openEditComment}>
              <span className="work-order-comment-mobile-action-label"><Pencil size={18} aria-hidden="true" />Edit</span>
            </button>
          )}
          {canDeleteComment && (
            <button type="button" className="is-danger" onClick={openDeleteComment}>
              <span className="work-order-comment-mobile-action-label"><Trash2 size={18} aria-hidden="true" />Delete Message</span>
            </button>
          )}
        </MobileActionSheet>
      )}
    </li>
  )
}

export function WorkOrderActivity({
  order,
  sectionRef,
  memberDirectory = [],
  assigneeOptions = [],
  mentionTargets = [],
  assignMentionsEnabled = false,
  currentUserId,
  canDeleteAnyComments = false,
  canViewComments,
  canPostComments,
  dateFormat,
  timezone,
  onLoadActivity,
  onPostComment,
  onUpdateComment,
  onDeleteComment,
  onResolveWorkOrderLinks,
}) {
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(Boolean(canViewComments && onLoadActivity))
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [commentError, setCommentError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [linkPreviews, setLinkPreviews] = useState({})
  const [mentionCursor, setMentionCursor] = useState(null)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const requestedPreviewIds = useRef(new Set())
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const commentInputRef = useRef(null)

  const loadActivity = useCallback(async ({ before = null, reset = false } = {}) => {
    if (!canViewComments || !onLoadActivity) return
    if (!reset) setIsLoadingOlder(true)
    try {
      const page = await onLoadActivity(order, before)
      if (reset) setLoadError('')
      setItems((current) => {
        const pageItems = chronologicalActivityPage(page.items)
        if (reset) return pageItems
        const knownIds = new Set(current.map((item) => `${item.kind}:${item.id}`))
        return [...pageItems.filter((item) => !knownIds.has(`${item.kind}:${item.id}`)), ...current]
      })
      setNextCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (error) {
      setLoadError(error.message || 'Unable to load comments and activity.')
    } finally {
      setIsLoading(false)
      setIsLoadingOlder(false)
    }
  }, [canViewComments, onLoadActivity, order])

  useEffect(() => {
    if (!canViewComments || !onLoadActivity) return undefined
    let active = true
    Promise.resolve()
      .then(() => onLoadActivity(order))
      .then((page) => {
        if (!active) return
        setLoadError('')
        setItems(chronologicalActivityPage(page.items))
        setNextCursor(page.nextCursor)
        setHasMore(page.hasMore)
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'Unable to load comments and activity.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [canViewComments, onLoadActivity, order])

  const linkedWorkOrderIds = useMemo(() => [...new Set(items
    .filter((item) => item.kind === 'comment' && item.body)
    .flatMap((item) => extractWorkbenchWorkOrderLinks(item.body)
      .filter((segment) => segment.type === 'work-order-link')
      .map((segment) => segment.workOrderId)))].slice(0, 50), [items])

  useEffect(() => {
    if (!onResolveWorkOrderLinks) return
    const pendingIds = linkedWorkOrderIds.filter((id) => !requestedPreviewIds.current.has(id))
    if (!pendingIds.length) return
    pendingIds.forEach((id) => requestedPreviewIds.current.add(id))
    let active = true
    onResolveWorkOrderLinks(pendingIds)
      .then((previews) => {
        if (!active) return
        setLinkPreviews((current) => ({
          ...current,
          ...Object.fromEntries(pendingIds.map((id) => [id, previews[id] ?? null])),
        }))
      })
      .catch(() => {
        if (active) setLinkPreviews((current) => ({
          ...current,
          ...Object.fromEntries(pendingIds.map((id) => [id, null])),
        }))
      })
    return () => { active = false }
  }, [linkedWorkOrderIds, onResolveWorkOrderLinks])

  const identitiesById = useMemo(() => new Map(memberDirectory.map((member) => [member.id, member])), [memberDirectory])
  const assigneeOptionsByValue = useMemo(() => new Map(assigneeOptions.map((option) => [option.value, option])), [assigneeOptions])
  const visibleItems = useMemo(() => items.filter((item) => !isAssignmentMentionComment(item, items, mentionTargets)), [items, mentionTargets])
  const mentionSuggestions = useMemo(() => assignMentionsEnabled
    ? getWorkOrderMentionSuggestions(commentBody, mentionCursor ?? commentBody.length, mentionTargets)
    : { activeMention: null, suggestions: [] }, [assignMentionsEnabled, commentBody, mentionCursor, mentionTargets])
  const selectMention = (target) => {
    const activeMention = mentionSuggestions.activeMention
    if (!activeMention) return
    const inserted = `@${target.mention} `
    const nextBody = `${commentBody.slice(0, activeMention.start)}${inserted}${commentBody.slice(activeMention.end)}`
    const nextCursor = activeMention.start + inserted.length
    setCommentBody(nextBody)
    setMentionCursor(nextCursor)
    setSelectedMentionIndex(0)
    window.requestAnimationFrame(() => {
      commentInputRef.current?.focus()
      commentInputRef.current?.setSelectionRange(nextCursor, nextCursor)
    })
  }
  const handleMentionKeyDown = (event) => {
    const suggestions = mentionSuggestions.suggestions
    if (!suggestions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedMentionIndex((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedMentionIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      selectMention(suggestions[selectedMentionIndex] ?? suggestions[0])
    } else if (event.key === 'Escape') {
      setMentionCursor(null)
    }
  }
  const addFiles = (files) => {
    setCommentError('')
    const invalidFile = files.find((file) => !file.size || file.size > WORK_ORDER_ATTACHMENT_MAX_BYTES || file.name.length > 255)
    if (invalidFile) {
      setCommentError(invalidFile.name.length > 255
        ? `${invalidFile.name} has a filename longer than 255 characters.`
        : `${invalidFile.name} must be between 1 byte and 10 MB.`)
      return
    }
    const next = [...selectedFiles, ...files]
    if (next.length > maxCommentAttachments) {
      setCommentError(`Attach up to ${maxCommentAttachments} files per comment.`)
      return
    }
    setSelectedFiles(next)
  }
  const handleFileSelection = (event) => {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }
  const sendComment = async (event) => {
    event.preventDefault()
    if (!onPostComment || isSending) return
    setCommentError('')
    setIsSending(true)
    try {
      const mentions = assignMentionsEnabled
        ? resolveWorkOrderMentionTargets(commentBody, mentionTargets)
        : { mentionedUserIds: [], mentionedTeamIds: [] }
      if (assignMentionsEnabled) {
        await onPostComment(order, commentBody, selectedFiles, mentions)
      } else {
        await onPostComment(order, commentBody, selectedFiles)
      }
      setCommentBody('')
      setMentionCursor(null)
      setSelectedMentionIndex(0)
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      await loadActivity({ reset: true })
    } catch (error) {
      setCommentError(error.message || 'Unable to send this comment.')
    } finally {
      setIsSending(false)
    }
  }

  const editComment = async (item, body) => {
    const updated = await onUpdateComment(order, item, body)
    setItems((current) => current.map((entry) => entry.kind === 'comment' && entry.id === item.id
      ? { ...entry, body: updated.body, edited_at: updated.edited_at }
      : entry))
    return updated
  }

  const deleteComment = async (item) => {
    const result = await onDeleteComment(order, item)
    setItems((current) => current.map((entry) => entry.kind === 'comment' && entry.id === item.id
      ? { ...entry, body: null, deleted_at: result.deletedAt, deleted_by: currentUserId, attachments: [] }
      : entry))
    return result
  }

  return (
    <section className="detail-comments-section" aria-label="Comments" ref={sectionRef}>
      {canPostComments && (
        <form className="work-order-comment-composer" onSubmit={sendComment}>
          <label className="work-order-comment-sr-only" htmlFor="work-order-comment-input">Write a comment</label>
          <div className="work-order-comment-input-wrap">
            <textarea
              ref={commentInputRef}
              id="work-order-comment-input"
              value={commentBody}
              onChange={(event) => {
                setCommentBody(event.target.value)
                setMentionCursor(event.target.selectionStart ?? event.target.value.length)
                setSelectedMentionIndex(0)
              }}
              onClick={(event) => setMentionCursor(event.target.selectionStart ?? commentBody.length)}
              onKeyUp={(event) => setMentionCursor(event.target.selectionStart ?? commentBody.length)}
              onKeyDown={handleMentionKeyDown}
            maxLength={10000}
              placeholder="Write a comment . . ."
              rows={3}
              disabled={isSending}
            />
            {mentionSuggestions.suggestions.length > 0 && (
              <div className="work-order-mention-suggestions" role="listbox" aria-label="Mention users or teams">
                {mentionSuggestions.suggestions.map((target, index) => (
                  <button
                    key={`${target.type}:${target.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === selectedMentionIndex}
                    className={index === selectedMentionIndex ? 'is-selected' : ''}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectMention(target)}
                  >
                    <span>@{target.mention}</span>
                    <small>{target.label}{target.type === 'team' ? ' · Team' : ''}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="work-order-comment-composer-footer">
            <label className="work-order-comment-attach" title="Attach images or files">
              <Paperclip size={22} aria-hidden="true" />
              <span className="work-order-comment-sr-only">Attach images or files</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                aria-label="Attach images or files"
                disabled={isSending}
                onChange={handleFileSelection}
              />
            </label>
            <label className="work-order-comment-attach" title="Take a photo">
              <Camera size={22} aria-hidden="true" />
              <span className="work-order-comment-sr-only">Take a photo</span>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Take a photo"
                disabled={isSending}
                onChange={handleFileSelection}
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              className="work-order-comment-send"
              disabled={isSending || (!commentBody.trim() && selectedFiles.length === 0)}
            >
              <Send size={14} aria-hidden="true" /> {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
          {selectedFiles.length > 0 && (
            <ul className="work-order-comment-pending-files" aria-label="Files to attach">
              {selectedFiles.map((file, index) => (
                <li key={`${file.name}:${file.size}:${file.lastModified}:${index}`}>
                  <Paperclip size={13} aria-hidden="true" />
                  <span>{file.name}</span>
                  <button type="button" aria-label={`Remove ${file.name}`} disabled={isSending} onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {commentError && <p className="work-order-comment-error" role="alert">{commentError}</p>}
        </form>
      )}
      <div className="work-order-activity-feed">
        {loadError && <p className="work-order-activity-error" role="alert">{loadError}</p>}
        {isLoading && <p className="work-order-activity-loading" role="status">Loading comments and activity…</p>}
        {!isLoading && canViewComments && visibleItems.length === 0 && !loadError && <p className="work-order-activity-empty">No comments or activity yet.</p>}
        {canViewComments && visibleItems.length > 0 && (
          <ul className="work-order-activity-list" aria-label="Work Order comments and activity">
            {visibleItems.map((item) => (
              <ActivityItem
                key={`${item.kind}:${item.id}`}
                item={item}
                identitiesById={identitiesById}
                assigneeOptionsByValue={assigneeOptionsByValue}
                mentionTargets={mentionTargets}
                dateFormat={dateFormat}
                timezone={timezone}
                linkPreviews={linkPreviews}
                currentUserId={currentUserId}
                canEditOwnComments={canPostComments}
                canDeleteOwnComments={canPostComments}
                canDeleteAnyComments={canDeleteAnyComments}
                onUpdateComment={onUpdateComment ? editComment : undefined}
                onDeleteComment={onDeleteComment ? deleteComment : undefined}
              />
            ))}
            {hasMore && (
              <li className="work-order-activity-load-more-item">
                <button type="button" className="work-order-activity-load-more" disabled={isLoadingOlder} onClick={() => void loadActivity({ before: nextCursor })}>
                  {isLoadingOlder ? 'Loading…' : 'Load older activity'}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
