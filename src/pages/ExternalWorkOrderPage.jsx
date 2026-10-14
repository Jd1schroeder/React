import { useEffect, useState } from 'react'
import { CheckCircle2, ClipboardList, FileText, LockKeyhole, MessageCircle, Paperclip, Send, ShieldCheck } from 'lucide-react'
import { useToast } from '../components/ui/useToast'
import { getExternalWorkOrder, markExternalWorkOrderFinished, postExternalWorkOrderComment } from '../services/externalWorkOrderService'
import { formatCalendarDateForUser, formatDateForUser } from '../utils/dateFormatting'
import './ExternalWorkOrderPage.css'

function statusLabel(status) {
  return status === 'Completed' ? 'Done' : status || 'Open'
}

function formatExternalTime(value, timeFormat = '11:59 PM') {
  const match = typeof value === 'string' ? value.match(/^(\d{1,2}):(\d{2})/) : null
  if (!match) return ''
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return ''
  if (timeFormat === '23:59') return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}

function formatExternalTimestamp(value, { dateFormat = 'MM/DD/YYYY', timeFormat = '11:59 PM', timezone } = {}) {
  if (!value) return ''
  const date = formatDateForUser(value, dateFormat, timezone)
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: timeFormat === '23:59' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: timeFormat !== '23:59',
    ...(timeFormat === '23:59' ? { hourCycle: 'h23' } : {}),
    ...(timezone ? { timeZone: timezone } : {}),
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  const time = timeFormat === '23:59'
    ? `${values.hour}:${values.minute}`
    : `${values.hour}:${values.minute} ${values.dayPeriod}`
  return `${date}, ${time}`
}

export function ExternalWorkOrderPage({ shareToken }) {
  const { showToast } = useToast()
  const [state, setState] = useState('loading')
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [comment, setComment] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  const loadWorkOrder = async () => {
    if (!shareToken) {
      setState('unavailable')
      return
    }
    setState('loading')
    setError('')
    try {
      const nextPayload = await getExternalWorkOrder(shareToken)
      if (!nextPayload?.available) {
        setState('unavailable')
        return
      }
      setPayload(nextPayload)
      setState('ready')
    } catch (loadError) {
      setError(loadError.message || 'Unable to load this Work Order.')
      setState('error')
    }
  }

  useEffect(() => {
    let active = true
    const loadInitialWorkOrder = async () => {
      if (!shareToken) {
        setState('unavailable')
        return
      }
      setState('loading')
      setError('')
      try {
        const nextPayload = await getExternalWorkOrder(shareToken)
        if (!active) return
        if (!nextPayload?.available) {
          setState('unavailable')
          return
        }
        setPayload(nextPayload)
        setState('ready')
      } catch (loadError) {
        if (!active) return
        setError(loadError.message || 'Unable to load this Work Order.')
        setState('error')
      }
    }
    void loadInitialWorkOrder()
    return () => { active = false }
  }, [shareToken])

  const submitComment = async (event) => {
    event.preventDefault()
    if (isPosting || !name.trim() || !comment.trim()) return
    setIsPosting(true)
    setError('')
    try {
      await postExternalWorkOrderComment({ token: shareToken, name, email, body: comment })
      setComment('')
      await loadWorkOrder()
      showToast('Comment added.')
    } catch (postError) {
      setError(postError.message || 'Unable to add your comment.')
    } finally {
      setIsPosting(false)
    }
  }

  const finishWorkOrder = async () => {
    if (isFinishing || !name.trim()) return
    setIsFinishing(true)
    setError('')
    try {
      await markExternalWorkOrderFinished({ token: shareToken, name })
      await loadWorkOrder()
      showToast('Work Order marked as finished.')
    } catch (finishError) {
      setError(finishError.message || 'Unable to mark the Work Order finished.')
    } finally {
      setIsFinishing(false)
    }
  }

  if (state === 'loading') return <ExternalShell><ExternalState title="Loading Work Order" message="Preparing the shared Work Order." /></ExternalShell>
  if (state === 'unavailable') return <ExternalShell><ExternalState title="This link is no longer available" message="The Work Order may have been closed, the link may have expired, or access may have been disabled." /></ExternalShell>
  if (state === 'error') return <ExternalShell><ExternalState title="Unable to load this Work Order" message={error} action={<button type="button" onClick={() => void loadWorkOrder()}>Try again</button>} /></ExternalShell>

  const {
    workOrder,
    permissions = {},
    preferences = { dateFormat: 'MM/DD/YYYY', timeFormat: '11:59 PM', timezone: undefined },
  } = payload
  const canComment = ['comment', 'interact'].includes(permissions.comments)
  const requireCommenterName = permissions.requireCommenterName !== false
  const requireCommenterEmail = permissions.requireCommenterEmail === true
  const canFinish = permissions.procedure === 'interact'
  const hasFinished = Boolean(workOrder.externalFinishedAt)

  return (
    <ExternalShell>
      <main className="external-work-order-page" aria-labelledby="external-work-order-title">
        <header className="external-work-order-header">
          <div>
            <p className="external-work-order-eyebrow">Shared Work Order</p>
            <h1 id="external-work-order-title">{workOrder.title}</h1>
            {workOrder.workOrderNumber && <p className="external-work-order-number">Work Order #{workOrder.workOrderNumber}</p>}
          </div>
          <span className={`external-work-order-status external-work-order-status--${workOrder.status?.toLowerCase().replaceAll(' ', '-')}`}>
            {statusLabel(workOrder.status)}
          </span>
        </header>

        {error && <p className="external-work-order-error" role="alert">{error}</p>}

        <section className="external-work-order-card external-work-order-summary" aria-labelledby="external-work-order-summary-title">
          <div className="external-work-order-card-heading">
            <ClipboardList size={20} aria-hidden="true" />
            <h2 id="external-work-order-summary-title">Work Order details</h2>
          </div>
          <div className="external-work-order-facts">
            {workOrder.dueDate && <ExternalFact label="Due date" value={`${formatCalendarDateForUser(workOrder.dueDate, preferences.dateFormat)}${workOrder.dueTime ? ` ${formatExternalTime(workOrder.dueTime, preferences.timeFormat)}` : ''}`} />}
            {workOrder.priority && <ExternalFact label="Priority" value={workOrder.priority} />}
            {workOrder.procedureProgress !== null && workOrder.procedureProgress !== undefined && <ExternalFact label="Procedure progress" value={`${workOrder.procedureProgress}%`} />}
          </div>
          {workOrder.description && <div className="external-work-order-description"><h3>Description</h3><p>{workOrder.description}</p></div>}
        </section>

        {workOrder.attachments?.length > 0 && <section className="external-work-order-card" aria-labelledby="external-work-order-attachments-title">
          <div className="external-work-order-card-heading"><Paperclip size={20} aria-hidden="true" /><h2 id="external-work-order-attachments-title">Attachments</h2></div>
          <ul className="external-work-order-attachments">
            {workOrder.attachments.map((attachment) => <li key={attachment.id}><FileText size={16} aria-hidden="true" /><span>{attachment.fileName}</span></li>)}
          </ul>
        </section>}

        {canFinish && <section className="external-work-order-card external-work-order-completion" aria-labelledby="external-work-order-completion-title">
          <div><div className="external-work-order-card-heading"><CheckCircle2 size={20} aria-hidden="true" /><h2 id="external-work-order-completion-title">Complete your work</h2></div><p>Let the Workbench team know when this work is finished.</p></div>
          {hasFinished ? <p className="external-work-order-finished" role="status">Marked finished by {workOrder.externalFinishedByName || 'external contact'}.</p> : <div className="external-work-order-completion-form"><label htmlFor="external-finish-name">Your name</label><input id="external-finish-name" value={name} onChange={(event) => setName(event.target.value)} maxLength="120" /><button type="button" onClick={() => void finishWorkOrder()} disabled={isFinishing || !name.trim()}>{isFinishing ? 'Saving...' : 'Mark as finished'}</button></div>}
        </section>}

        {permissions.comments !== 'hidden' && <section className="external-work-order-card" aria-labelledby="external-work-order-comments-title">
          <div className="external-work-order-card-heading"><MessageCircle size={20} aria-hidden="true" /><h2 id="external-work-order-comments-title">Comments</h2></div>
          {workOrder.comments?.length > 0 ? <div className="external-work-order-comments">{workOrder.comments.map((item) => <article className="external-work-order-comment" key={item.id}><div><strong>{item.authorName}</strong><time dateTime={item.createdAt}>{formatExternalTimestamp(item.createdAt, preferences)}</time></div><p>{item.body}</p></article>)}</div> : <p className="external-work-order-empty">No comments yet.</p>}
          {canComment && <form className="external-work-order-comment-form" onSubmit={submitComment}><label htmlFor="external-comment-name">Your name {!requireCommenterName && <span>(optional)</span>}{requireCommenterName && <span>(required)</span>}</label><input id="external-comment-name" value={name} onChange={(event) => setName(event.target.value)} maxLength="120" required={requireCommenterName} /><label htmlFor="external-comment-email">Email {!requireCommenterEmail && <span>(optional)</span>}{requireCommenterEmail && <span>(required)</span>}</label><input id="external-comment-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength="320" required={requireCommenterEmail} /><label htmlFor="external-comment-body">Add a comment</label><textarea id="external-comment-body" value={comment} onChange={(event) => setComment(event.target.value)} maxLength="10000" rows="4" required /><button type="submit" disabled={isPosting || (requireCommenterName && !name.trim()) || !comment.trim()}><Send size={16} aria-hidden="true" />{isPosting ? 'Sending...' : 'Add comment'}</button></form>}
        </section>}
      </main>
    </ExternalShell>
  )
}

function ExternalShell({ children }) {
  return <div className="external-work-order-shell"><header className="external-work-order-brand"><div className="external-work-order-brand-mark"><ShieldCheck size={18} aria-hidden="true" /></div><span>Workbench</span><span className="external-work-order-brand-label">External access</span></header>{children}<footer className="external-work-order-footer"><LockKeyhole size={15} aria-hidden="true" /> This secure link provides access only to the shared Work Order.</footer></div>
}

function ExternalState({ title, message, action }) {
  return <main className="external-work-order-state" role="status"><ShieldCheck size={28} aria-hidden="true" /><h1>{title}</h1><p>{message}</p>{action}</main>
}

function ExternalFact({ label, value }) {
  return <div className="external-work-order-fact"><span>{label}</span><strong>{value}</strong></div>
}

