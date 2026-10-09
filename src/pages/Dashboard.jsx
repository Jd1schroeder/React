import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  ArrowUp,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileText,
  Clock3,
  Inbox,
  List,
  LockKeyhole,
  MapPin,
  Network,
  Plus,
  ScanQrCode,
  Settings,
  ThumbsUp,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { useWorkspace } from '../components/layout/useWorkspace'
import { Avatar } from '../components/ui/Avatar'
import { useMobileSheetDismiss } from '../components/layout/useMobileSheetDismiss'
import { hasPermission } from '../services/authorizationService'
import { getDashboardMetricWorkOrders, getDashboardOverview, getDashboardRecentActivityPage, getDashboardWorkOrderGroupPage } from '../services/dashboardService'
import { getRecordPath } from '../routes'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { workOrderStatusOptions } from './work-orders/workOrderStatusOptions'
import './Dashboard.css'

function getCalendarDate(timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getGreeting(timeZone) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(new Date()))
  return greetingForHour(hour)
}

function formatActivityTime(value, timeZone) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(value))
}

function getActivityPhrase(event) {
  if (event.event_type === 'work_order_created') return 'created'
  if (event.event_type === 'status_changed') {
    return event.details?.to === 'Completed' ? 'completed' : `changed the status to ${event.details?.to ?? 'updated'}`
  }
  return 'updated'
}

const dashboardMetricDefinitions = {
  'high-priority': {
    key: 'high-priority',
    label: 'High Priority Work Orders',
    icon: ArrowUp,
    tone: 'red',
  },
  overdue: {
    key: 'overdue',
    label: 'Overdue Work Orders',
    icon: Clock3,
    tone: 'red',
  },
  requests: {
    key: 'requests',
    label: 'Requests Pending Approval',
    icon: Inbox,
    tone: 'amber',
  },
  completed: {
    key: 'completed',
    label: 'Completed Work Orders',
    icon: Check,
    tone: 'green',
  },
}

const dashboardCreateOptions = [
  { label: 'Work Order', icon: ClipboardList, available: true },
  { label: 'Purchase Order', icon: FileText },
  { label: 'Asset', icon: Network },
  { label: 'Part', icon: Settings },
  { label: 'Procedure', icon: List },
  { label: 'Location', icon: MapPin },
]

const dashboardWorkOrderGroupIcons = {
  'assigned-to-me': UserRound,
  'assigned-to-my-teams': UsersRound,
}

const dashboardWorkOrderGroupTitles = {
  'assigned-to-me': 'Assigned To Me',
  'assigned-to-my-teams': 'Assigned To My Teams',
}

function DashboardQuickAction({ icon: Icon, label, hint, disabled = false, disabledMessage = 'Coming soon', onClick, badge }) {
  return (
    <button className="dashboard-quick-action" type="button" disabled={disabled} onClick={onClick} title={hint}>
      <span className="dashboard-quick-action-icon">
        <Icon size={27} strokeWidth={2} aria-hidden="true" />
        {badge > 0 && <span className="dashboard-quick-action-badge" aria-label={`${badge} due today`}>{badge > 99 ? '99+' : badge}</span>}
      </span>
      <span className="dashboard-quick-action-label">{label}</span>
      {disabled && <span className="dashboard-quick-action-hint">{disabledMessage}</span>}
    </button>
  )
}

function MetricCard({ metric, value, onClick, unavailable = false }) {
  const Icon = metric.icon
  return (
    <button type="button" className={`dashboard-metric-card${unavailable ? ' is-unavailable' : ''}`} aria-haspopup="dialog" onClick={onClick}>
      <span className={`dashboard-metric-icon is-${metric.tone}`}><Icon size={26} strokeWidth={2.4} aria-hidden="true" /></span>
      <strong className="dashboard-metric-value">{value}</strong>
      <ChevronRight className="dashboard-metric-chevron" size={23} aria-hidden="true" />
      <span className="dashboard-metric-label">{metric.label}{unavailable && ' (coming soon)'}</span>
    </button>
  )
}

function DashboardMetricSheet({ metric, count, organizationId, grants, timeZone, canCreateWorkOrders, onClose, onNavigate, triggerRef }) {
  const [result, setResult] = useState({ status: metric.key === 'requests' ? 'unavailable' : count === 0 ? 'ready' : 'loading', workOrders: [], error: '' })
  const [retryVersion, setRetryVersion] = useState(0)
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const sheetDismiss = useMobileSheetDismiss(onClose)
  const Icon = metric.icon

  useEffect(() => {
    if (metric.key === 'requests') return undefined
    if (count === 0) return undefined
    let active = true
    getDashboardMetricWorkOrders({
      organizationId,
      metric: metric.key,
      today: getCalendarDate(timeZone),
      grants,
    }).then((workOrders) => {
      if (active) setResult({ status: 'ready', workOrders, error: '' })
    }).catch((error) => {
      if (active) setResult({ status: 'error', workOrders: [], error: error.message || 'Unable to load these Work Orders.' })
    })
    return () => { active = false }
  }, [count, grants, metric.key, organizationId, retryVersion, timeZone])

  useEffect(() => {
    const triggerElement = triggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href]')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (triggerElement?.isConnected) triggerElement.focus()
    }
  }, [onClose, triggerRef])

  const isEmpty = (result.status === 'ready' && result.workOrders.length === 0) || (metric.key !== 'requests' && count === 0)
  const isLoading = result.status === 'loading' && count > 0
  const isRequestPlaceholder = result.status === 'unavailable'
  const handleCreate = () => onNavigate('/workorders?create=1')
  const handleViewAll = () => onNavigate(`/workorders?dashboardFilter=${metric.key}`)

  return createPortal(
    <div className="dashboard-metric-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className={`dashboard-metric-sheet mobile-edge-to-edge-sheet${isEmpty || isRequestPlaceholder ? ' is-empty' : ' is-list'} ${sheetDismiss.dragClassName}`} style={sheetDismiss.dragStyle} onTransitionEnd={sheetDismiss.onTransitionEnd} role="dialog" aria-modal="true" aria-labelledby="dashboard-metric-sheet-title">
        <header className="dashboard-metric-sheet-header mobile-sheet-drag-handle" {...sheetDismiss.dragHandleProps}>
          <Icon className={`dashboard-metric-sheet-icon is-${metric.tone}`} size={36} strokeWidth={2.4} aria-hidden="true" />
          <h2 id="dashboard-metric-sheet-title">{metric.label}</h2>
          <button ref={closeButtonRef} className="dashboard-metric-sheet-close" type="button" aria-label="Close" onClick={onClose}><X size={28} aria-hidden="true" /></button>
        </header>

        <div className="dashboard-metric-sheet-content" aria-live="polite">
          {isLoading && <p className="dashboard-metric-sheet-message" role="status">Loading Work Orders...</p>}
          {result.status === 'error' && <div className="dashboard-metric-sheet-error" role="alert"><p>{result.error}</p><button type="button" onClick={() => setRetryVersion((version) => version + 1)}>Try again</button></div>}
          {isRequestPlaceholder && <div className="dashboard-metric-empty-state is-coming-soon"><Inbox size={88} strokeWidth={1.8} aria-hidden="true" /><h3>Requests are coming soon</h3><p>Request approvals will appear here when the Requests module is available.</p></div>}
          {isEmpty && <div className="dashboard-metric-empty-state"><ThumbsUp size={96} strokeWidth={1.8} aria-hidden="true" /><h3>All good here!</h3><p>There are no {metric.label}</p></div>}
          {result.status === 'ready' && result.workOrders.length > 0 && <ul className="dashboard-metric-order-list">
            {result.workOrders.map((order) => (
              <li key={order.id}>
                <Link className="dashboard-metric-order-row" to={getRecordPath('workorders', order.id)}>
                  <span className="dashboard-metric-order-title">{order.title}</span>
                  <span className="dashboard-metric-order-number">#{order.work_order_number}</span>
                  <span className="dashboard-metric-order-meta"><WorkOrderStatus status={order.status} /><PriorityBadge priority={order.priority} /></span>
                </Link>
              </li>
            ))}
          </ul>}
        </div>

        {isEmpty && canCreateWorkOrders && <footer className="dashboard-metric-sheet-footer"><button className="dashboard-metric-create" type="button" onClick={handleCreate}><Plus size={28} aria-hidden="true" />Create Work Order</button></footer>}
        {result.status === 'ready' && result.workOrders.length > 0 && count > result.workOrders.length && <footer className="dashboard-metric-sheet-footer"><button className="dashboard-metric-view-all" type="button" onClick={handleViewAll}>View all {count} Work Orders <ArrowRight size={20} aria-hidden="true" /></button></footer>}
      </section>
    </div>,
    document.body,
  )
}

function DashboardWorkOrderGroupSheet({ group, organizationId, grants, onClose, triggerRef }) {
  const [workOrders, setWorkOrders] = useState([])
  const [status, setStatus] = useState(group.count > 0 ? 'loading' : 'ready')
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const [nextOffset, setNextOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [retryVersion, setRetryVersion] = useState(0)
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const loadingMoreRef = useRef(false)
  const Icon = dashboardWorkOrderGroupIcons[group.id] ?? UserRound
  const sheetDismiss = useMobileSheetDismiss(onClose)

  useEffect(() => {
    if (group.count === 0) return undefined
    let active = true
    getDashboardWorkOrderGroupPage({ organizationId, groupId: group.id, offset: 0, totalCount: group.count, grants })
      .then((page) => {
        if (!active) return
        setWorkOrders(page.items)
        setNextOffset(page.nextOffset)
        setHasMore(page.hasMore)
        setStatus('ready')
        setError('')
      })
      .catch((loadError) => {
        if (!active) return
        setStatus('error')
        setError(loadError.message || 'Unable to load these Work Orders.')
      })
    return () => { active = false }
  }, [grants, group.count, group.id, organizationId, retryVersion])

  useEffect(() => {
    const triggerElement = triggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href]')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (triggerElement?.isConnected) triggerElement.focus()
    }
  }, [onClose, triggerRef])

  const loadNextPage = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setIsLoadingMore(true)
    setLoadMoreError('')
    try {
      const page = await getDashboardWorkOrderGroupPage({ organizationId, groupId: group.id, offset: nextOffset, totalCount: group.count, grants })
      setWorkOrders((current) => {
        const existingIds = new Set(current.map((order) => order.id))
        return [...current, ...page.items.filter((order) => !existingIds.has(order.id))]
      })
      setNextOffset(page.nextOffset)
      setHasMore(page.hasMore)
    } catch (loadError) {
      setLoadMoreError(loadError.message || 'Unable to load more Work Orders.')
    } finally {
      loadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [group.count, group.id, grants, hasMore, nextOffset, organizationId])

  return createPortal(
    <div className="dashboard-metric-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section
        ref={dialogRef}
        className={`dashboard-metric-sheet mobile-edge-to-edge-sheet is-list dashboard-group-sheet ${sheetDismiss.dragClassName}`}
        style={sheetDismiss.dragStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-group-sheet-title"
        onTransitionEnd={sheetDismiss.onTransitionEnd}
      >
        <header className="dashboard-metric-sheet-header dashboard-group-sheet-header mobile-sheet-drag-handle" {...sheetDismiss.dragHandleProps}>
          <Icon className="dashboard-metric-sheet-icon dashboard-group-sheet-icon" size={36} strokeWidth={2.4} aria-hidden="true" />
          <h2 id="dashboard-group-sheet-title">{dashboardWorkOrderGroupTitles[group.id] ?? group.label}</h2>
          <button ref={closeButtonRef} className="dashboard-metric-sheet-close" type="button" aria-label="Close" onClick={onClose}><X size={28} aria-hidden="true" /></button>
        </header>

        <div className="dashboard-metric-sheet-content" aria-live="polite">
          {status === 'loading' && <p className="dashboard-metric-sheet-message" role="status">Loading Work Orders...</p>}
          {status === 'error' && <div className="dashboard-metric-sheet-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setStatus('loading'); setRetryVersion((version) => version + 1) }}>Try again</button></div>}
          {status === 'ready' && workOrders.length === 0 && <p className="dashboard-metric-sheet-message">No Work Orders are currently in this list.</p>}
          {status === 'ready' && workOrders.length > 0 && <ul className="dashboard-metric-order-list">
            {workOrders.map((order) => (
              <li key={order.id}>
                <Link className="dashboard-metric-order-row" to={getRecordPath('workorders', order.id)}>
                  <span className="dashboard-metric-order-title">{order.title}</span>
                  <span className="dashboard-metric-order-number">#{order.work_order_number}</span>
                  <span className="dashboard-metric-order-meta"><WorkOrderStatus status={order.status} /><PriorityBadge priority={order.priority} /></span>
                </Link>
              </li>
            ))}
          </ul>}
          {isLoadingMore && <p className="dashboard-group-sheet-load-status" role="status">Loading more Work Orders...</p>}
          {loadMoreError && <p className="dashboard-group-sheet-load-error" role="alert">{loadMoreError}</p>}
        </div>

        {hasMore && <footer className="dashboard-metric-sheet-footer"><button className="dashboard-metric-view-all" type="button" onClick={() => void loadNextPage()} disabled={isLoadingMore}>{loadMoreError ? 'Try again' : 'Load more Work Orders'} <ArrowRight size={20} aria-hidden="true" /></button></footer>}
      </section>
    </div>,
    document.body,
  )
}

function DashboardCreateSheet({ onClose, onNavigate, triggerRef }) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const sheetDismiss = useMobileSheetDismiss(onClose)

  useEffect(() => {
    const triggerElement = triggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled)')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (triggerElement?.isConnected) triggerElement.focus()
    }
  }, [onClose, triggerRef])

  const handleSelect = (option) => {
    if (!option.available) return
    onClose()
    onNavigate('/workorders?create=1')
  }

  return createPortal(
    <div className="dashboard-create-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className={`dashboard-create-sheet mobile-edge-to-edge-sheet ${sheetDismiss.dragClassName}`} style={sheetDismiss.dragStyle} onTransitionEnd={sheetDismiss.onTransitionEnd} role="dialog" aria-modal="true" aria-labelledby="dashboard-create-title">
        <header className="dashboard-create-header mobile-sheet-drag-handle" {...sheetDismiss.dragHandleProps}>
          <h2 id="dashboard-create-title">What would you like to Create?</h2>
          <button ref={closeButtonRef} className="dashboard-metric-sheet-close" type="button" aria-label="Close" onClick={onClose}><X size={28} aria-hidden="true" /></button>
        </header>
        <ul className="dashboard-create-options">
          {dashboardCreateOptions.map((option) => {
            const Icon = option.icon
            return <li key={option.label}>
              <button className={`dashboard-create-option${option.available ? '' : ' is-unavailable'}`} type="button" disabled={!option.available} onClick={() => handleSelect(option)}>
                <span className="dashboard-create-option-icon"><Icon size={27} strokeWidth={2.3} aria-hidden="true" /></span>
                <span className="dashboard-create-option-label">{option.label}</span>
                {option.available ? <ChevronRight className="dashboard-create-option-arrow" size={23} strokeWidth={2.5} aria-hidden="true" /> : <LockKeyhole className="dashboard-create-option-lock" size={19} aria-hidden="true" />}
                {!option.available && <span className="dashboard-create-option-sr-only">Coming soon</span>}
              </button>
            </li>
          })}
        </ul>
      </section>
    </div>,
    document.body,
  )
}

function WorkOrderStatus({ status }) {
  const option = workOrderStatusOptions.find((item) => item.value === status)
  const Icon = option?.icon ?? Inbox
  return <span className={`dashboard-work-order-status is-${(status ?? 'open').toLowerCase().replaceAll(' ', '-')}`}><Icon size={15} aria-hidden="true" />{status === 'Completed' ? 'Done' : status}</span>
}

function WorkOrderGroupCard({ group, onViewAll }) {
  return (
    <section className="dashboard-work-order-group" aria-label={group.label}>
      <header className="dashboard-work-order-group-header">
        <h3>{group.label} <span>({group.count})</span></h3>
      </header>
      {group.workOrders.length > 0 ? <ul className="dashboard-work-order-list">
        {group.workOrders.map((order) => (
          <li key={order.id}>
            <Link className="dashboard-work-order-row" to={getRecordPath('workorders', order.id)}>
              <span className="dashboard-work-order-title">{order.title}</span>
              <span className="dashboard-work-order-number">#{order.work_order_number}</span>
              <span className="dashboard-work-order-row-meta">
                <WorkOrderStatus status={order.status} />
                <PriorityBadge priority={order.priority} />
              </span>
            </Link>
          </li>
        ))}
      </ul> : <p className="dashboard-work-order-empty">No work orders in this list right now.</p>}
      <Link className="dashboard-view-all" to="/workorders" onClick={(event) => onViewAll(group, event)}>View all <ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
  )
}

function ActivityRow({ event, timeZone, currentUserId, currentUserProfile, currentUserName, currentUserFirstName, currentUserLastName }) {
  const order = event.workOrder
  const isCurrentUser = Boolean(currentUserId && event.actor_id === currentUserId)
  const actorName = isCurrentUser ? currentUserName : event.actorLabel
  return (
    <li className="dashboard-activity-row">
      <span className={`dashboard-activity-avatar${isCurrentUser ? ' is-you' : ''}`} aria-hidden="true">
        {isCurrentUser
          ? <Avatar className="dashboard-activity-avatar-image" src={currentUserProfile?.avatar_url} firstName={currentUserProfile?.first_name || currentUserFirstName} lastName={currentUserProfile?.last_name || currentUserLastName} name={currentUserName} alt="" />
          : 'T'}
      </span>
      <p>
        <strong>{actorName}</strong> {getActivityPhrase(event)}{' '}
        <Link to={getRecordPath('workorders', order.id)}>#{order.work_order_number} {order.title}</Link>.
        <time dateTime={event.created_at}>{formatActivityTime(event.created_at, timeZone)}</time>
      </p>
    </li>
  )
}

function RecentActivityFeed({ events: initialEvents, hasMore: initialHasMore, cursor: initialCursor, organizationId, userId, grants, timeZone, currentUserProfile, currentUserName, currentUserFirstName, currentUserLastName }) {
  const [events, setEvents] = useState(initialEvents)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [cursor, setCursor] = useState(initialCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const feedRef = useRef(null)
  const sentinelRef = useRef(null)
  const loadingRef = useRef(false)
  const pauseAutomaticLoadingRef = useRef(false)

  const loadNextPage = useCallback(async (manual = false) => {
    if (manual) pauseAutomaticLoadingRef.current = false
    if (loadingRef.current || !hasMore || !cursor || pauseAutomaticLoadingRef.current) return

    loadingRef.current = true
    setIsLoading(true)
    setError('')
    try {
      const page = await getDashboardRecentActivityPage({ organizationId, userId, grants, before: cursor })
      setEvents((currentEvents) => {
        const existingIds = new Set(currentEvents.map((event) => event.id))
        return [...currentEvents, ...page.items.filter((event) => !existingIds.has(event.id))]
      })
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (loadError) {
      pauseAutomaticLoadingRef.current = true
      setError(loadError.message || 'Unable to load more activity.')
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
  }, [cursor, grants, hasMore, organizationId, userId])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadNextPage()
    }, {
      root: feedRef.current?.closest('.page-content') ?? null,
      rootMargin: '0px 0px 320px 0px',
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadNextPage])

  return <div className="dashboard-activity-feed" ref={feedRef}>
    <ul className="dashboard-activity-list">
      {events.map((event) => <ActivityRow event={event} timeZone={timeZone} currentUserId={userId} currentUserProfile={currentUserProfile} currentUserName={currentUserName} currentUserFirstName={currentUserFirstName} currentUserLastName={currentUserLastName} key={event.id} />)}
    </ul>
    <div className="dashboard-activity-feed-footer">
      {isLoading && <p className="dashboard-activity-feed-status" role="status">Loading more activity…</p>}
      {error && <p className="dashboard-activity-feed-error" role="alert">{error}</p>}
      {hasMore
        ? <button className="dashboard-activity-load-more" type="button" onClick={() => void loadNextPage(true)} disabled={isLoading}>{error ? 'Retry loading activity' : 'Load more activity'}</button>
        : <p className="dashboard-activity-feed-status">You’re all caught up.</p>}
      {hasMore && <div className="dashboard-activity-feed-sentinel" ref={sentinelRef} aria-hidden="true" />}
    </div>
  </div>
}

export function Dashboard({ onNavigate }) {
  const workspace = useWorkspace()
  const organizationId = workspace.organization?.id
  const userId = workspace.user?.id
  const grants = useMemo(() => workspace.authorization?.grants ?? {}, [workspace.authorization?.grants])
  const timeZone = workspace.preferences?.timezone
  const firstName = workspace.profile?.first_name || workspace.user?.user_metadata?.first_name || ''
  const lastName = workspace.profile?.last_name || workspace.user?.user_metadata?.last_name || ''
  const currentUserName = [firstName, lastName].filter(Boolean).join(' ').trim()
    || workspace.user?.user_metadata?.full_name
    || workspace.user?.user_metadata?.name
    || workspace.user?.email
    || 'Current user'
  const displayGreeting = useMemo(() => getGreeting(timeZone), [timeZone])
  const [overview, setOverview] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [isCreateButtonCollapsed, setIsCreateButtonCollapsed] = useState(false)
  const [activeMetricKey, setActiveMetricKey] = useState(null)
  const [activeWorkOrderGroup, setActiveWorkOrderGroup] = useState(null)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const dashboardRef = useRef(null)
  const metricTriggerRef = useRef(null)
  const groupTriggerRef = useRef(null)
  const createTriggerRef = useRef(null)
  const canViewWorkOrders = hasPermission(grants, 'work_orders.view')
  const canCreateWorkOrders = canViewWorkOrders && hasPermission(grants, 'work_orders.create')
  const canInviteUsers = hasPermission(grants, 'organization.invite_users')
  const closeMetricSheet = useCallback(() => setActiveMetricKey(null), [])
  const closeGroupSheet = useCallback(() => setActiveWorkOrderGroup(null), [])
  const closeCreateSheet = useCallback(() => setIsCreateSheetOpen(false), [])
  const openCreateSheet = useCallback((event) => {
    createTriggerRef.current = event.currentTarget
    setIsCreateSheetOpen(true)
  }, [])
  const openMetricSheet = useCallback((metricKey, event) => {
    metricTriggerRef.current = event.currentTarget
    setActiveMetricKey(metricKey)
  }, [])
  const openGroupSheet = useCallback((group, event) => {
    const isMobile = window.matchMedia?.('(max-width: 840px)').matches ?? window.innerWidth <= 840
    if (!isMobile) return
    event.preventDefault()
    groupTriggerRef.current = event.currentTarget
    setActiveWorkOrderGroup(group)
  }, [])

  useEffect(() => {
    const scrollContainer = dashboardRef.current?.closest('.page-content')
    if (!scrollContainer) return undefined

    const updateCreateButton = () => setIsCreateButtonCollapsed(scrollContainer.scrollTop > 8)
    updateCreateButton()
    scrollContainer.addEventListener('scroll', updateCreateButton, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', updateCreateButton)
  }, [])

  useEffect(() => {
    let active = true
    const loadOverview = async () => {
      try {
        const result = await getDashboardOverview({
          organizationId,
          userId,
          grants,
          today: getCalendarDate(timeZone),
        })
        if (!active) return
        setOverview(result)
        setLoadState('ready')
        setError('')
      } catch (loadError) {
        if (!active) return
        setError(loadError.message || 'Unable to load your workspace overview.')
        setLoadState('error')
      }
    }
    void loadOverview()
    return () => { active = false }
  }, [grants, organizationId, refreshVersion, timeZone, userId])

  const metrics = overview?.metrics
  const organizationName = workspace.organization?.name || 'your workspace'

  return <>
    <div className="dashboard-page" ref={dashboardRef}>
      <section className="dashboard-welcome" aria-labelledby="dashboard-title">
        <p className="dashboard-greeting">{displayGreeting}{firstName ? `, ${firstName}` : ''}!</p>
        <h1 id="dashboard-title">Welcome to {organizationName}</h1>
      </section>

      <nav className="dashboard-quick-actions" aria-label="Quick actions">
        <DashboardQuickAction icon={CalendarDays} label="Due Today" hint="Show work orders due today" badge={metrics?.dueTodayCount} onClick={() => onNavigate('/workorders?dashboardFilter=due-today')} />
        <DashboardQuickAction icon={UserPlus} label="Invite" hint={canInviteUsers ? 'Invite a teammate' : 'Only users with invite permission can invite teammates'} disabled={!canInviteUsers} disabledMessage="Admin only" onClick={() => onNavigate('Settings / Invite Users')} />
        <DashboardQuickAction icon={ScanQrCode} label="Scan Code" hint="Code scanning is not available yet" disabled />
        <DashboardQuickAction icon={CircleHelp} label="Support" hint="Open messages" onClick={() => onNavigate('Messages')} />
      </nav>

      <section className="dashboard-section dashboard-status-section" aria-labelledby="dashboard-status-title">
        <h2 id="dashboard-status-title">Work Orders Status</h2>
        {loadState === 'loading' && <p className="dashboard-section-state" role="status">Loading work order totals...</p>}
        {loadState === 'error' && <div className="dashboard-section-state" role="alert"><span>{error}</span><button type="button" onClick={() => { setLoadState('loading'); setRefreshVersion((version) => version + 1) }}>Try again</button></div>}
        {loadState === 'ready' && overview?.canViewWorkOrders && <div className="dashboard-metrics-grid">
          <MetricCard metric={dashboardMetricDefinitions['high-priority']} value={metrics.highPriorityCount} onClick={(event) => openMetricSheet('high-priority', event)} />
          <MetricCard metric={dashboardMetricDefinitions.overdue} value={metrics.overdueCount} onClick={(event) => openMetricSheet('overdue', event)} />
          <MetricCard metric={dashboardMetricDefinitions.requests} value="N/A" unavailable onClick={(event) => openMetricSheet('requests', event)} />
          <MetricCard metric={dashboardMetricDefinitions.completed} value={metrics.completedCount} onClick={(event) => openMetricSheet('completed', event)} />
        </div>}
        {loadState === 'ready' && !overview?.canViewWorkOrders && <p className="dashboard-section-state">Your role does not include Work Order access.</p>}
      </section>

      <section className="dashboard-section dashboard-todo-section" aria-labelledby="dashboard-todo-title">
        <div className="dashboard-section-heading">
          <h2 id="dashboard-todo-title">To Do List</h2>
          {canCreateWorkOrders && <button className={`dashboard-create-button${isCreateButtonCollapsed ? ' is-collapsed' : ''}`} type="button" aria-label="Create" aria-haspopup="dialog" onClick={openCreateSheet}><Plus size={24} aria-hidden="true" /><span>Create</span></button>}
        </div>
        {loadState === 'loading' && <p className="dashboard-section-state" role="status">Loading your work...</p>}
        {loadState === 'ready' && overview?.canViewWorkOrders && <div className="dashboard-work-order-carousel">
          {overview.groups.map((group) => <WorkOrderGroupCard group={group} onViewAll={openGroupSheet} key={group.id} />)}
        </div>}
        {loadState === 'ready' && !overview?.canViewWorkOrders && <p className="dashboard-section-state">Work Orders are not available for your account.</p>}
      </section>

      <section className="dashboard-section dashboard-activity-section" aria-labelledby="dashboard-activity-title">
        <h2 id="dashboard-activity-title">Recent Activity</h2>
        {loadState === 'loading' && <p className="dashboard-section-state" role="status">Loading recent activity...</p>}
        {loadState === 'ready' && !overview.activityAvailable && <p className="dashboard-section-state">Activity access is not included in your role.</p>}
        {loadState === 'ready' && overview.activityAvailable && overview.recentActivity.length === 0 && !overview.recentActivityHasMore && <p className="dashboard-section-state">No recent Work Order activity.</p>}
        {loadState === 'ready' && overview.activityAvailable && (overview.recentActivity.length > 0 || overview.recentActivityHasMore) && <RecentActivityFeed
          key={`${organizationId}:${refreshVersion}`}
          events={overview.recentActivity}
          hasMore={overview.recentActivityHasMore}
          cursor={overview.recentActivityCursor}
          organizationId={organizationId}
          userId={userId}
          grants={grants}
          timeZone={timeZone}
          currentUserProfile={workspace.profile}
          currentUserName={currentUserName}
          currentUserFirstName={firstName}
          currentUserLastName={lastName}
        />}
      </section>
    </div>
    {activeMetricKey && <DashboardMetricSheet
      key={activeMetricKey}
      metric={dashboardMetricDefinitions[activeMetricKey]}
      count={activeMetricKey === 'requests' ? 0 : metrics?.[`${activeMetricKey === 'high-priority' ? 'highPriority' : activeMetricKey}Count`] ?? 0}
      organizationId={organizationId}
      grants={grants}
      timeZone={timeZone}
      canCreateWorkOrders={canCreateWorkOrders}
      onClose={closeMetricSheet}
      onNavigate={onNavigate}
      triggerRef={metricTriggerRef}
    />}
    {activeWorkOrderGroup && <DashboardWorkOrderGroupSheet
      key={activeWorkOrderGroup.id}
      group={activeWorkOrderGroup}
      organizationId={organizationId}
      grants={grants}
      onClose={closeGroupSheet}
      triggerRef={groupTriggerRef}
    />}
    {isCreateSheetOpen && <DashboardCreateSheet onClose={closeCreateSheet} onNavigate={onNavigate} triggerRef={createTriggerRef} />}
  </>
}
