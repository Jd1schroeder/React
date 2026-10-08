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
  Clock3,
  Inbox,
  Plus,
  ScanQrCode,
  ThumbsUp,
  UserPlus,
  X,
} from 'lucide-react'
import { useWorkspace } from '../components/layout/useWorkspace'
import { hasPermission } from '../services/authorizationService'
import { getDashboardMetricWorkOrders, getDashboardOverview } from '../services/dashboardService'
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
      <section ref={dialogRef} className={`dashboard-metric-sheet${isEmpty || isRequestPlaceholder ? ' is-empty' : ' is-list'}${isRequestPlaceholder ? ' is-compact' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dashboard-metric-sheet-title">
        <header className="dashboard-metric-sheet-header">
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

function WorkOrderStatus({ status }) {
  const option = workOrderStatusOptions.find((item) => item.value === status)
  const Icon = option?.icon ?? Inbox
  return <span className={`dashboard-work-order-status is-${(status ?? 'open').toLowerCase().replaceAll(' ', '-')}`}><Icon size={15} aria-hidden="true" />{status === 'Completed' ? 'Done' : status}</span>
}

function WorkOrderGroupCard({ group }) {
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
      <Link className="dashboard-view-all" to="/workorders">View all <ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
  )
}

function ActivityRow({ event, timeZone }) {
  const order = event.workOrder
  return (
    <li className="dashboard-activity-row">
      <span className={`dashboard-activity-avatar${event.actorLabel === 'You' ? ' is-you' : ''}`} aria-hidden="true">
        {event.actorLabel === 'You' ? 'You' : 'T'}
      </span>
      <p>
        <strong>{event.actorLabel}</strong> {getActivityPhrase(event)}{' '}
        <Link to={getRecordPath('workorders', order.id)}>#{order.work_order_number} {order.title}</Link>.
        <time dateTime={event.created_at}>{formatActivityTime(event.created_at, timeZone)}</time>
      </p>
    </li>
  )
}

export function Dashboard({ onNavigate }) {
  const workspace = useWorkspace()
  const organizationId = workspace.organization?.id
  const userId = workspace.user?.id
  const grants = useMemo(() => workspace.authorization?.grants ?? {}, [workspace.authorization?.grants])
  const timeZone = workspace.preferences?.timezone
  const firstName = workspace.profile?.first_name || workspace.user?.user_metadata?.first_name || ''
  const displayGreeting = useMemo(() => getGreeting(timeZone), [timeZone])
  const [overview, setOverview] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [isCreateButtonCollapsed, setIsCreateButtonCollapsed] = useState(false)
  const [activeMetricKey, setActiveMetricKey] = useState(null)
  const dashboardRef = useRef(null)
  const metricTriggerRef = useRef(null)
  const canViewWorkOrders = hasPermission(grants, 'work_orders.view')
  const canCreateWorkOrders = canViewWorkOrders && hasPermission(grants, 'work_orders.create')
  const canInviteUsers = hasPermission(grants, 'organization.invite_users')
  const closeMetricSheet = useCallback(() => setActiveMetricKey(null), [])
  const openMetricSheet = useCallback((metricKey, event) => {
    metricTriggerRef.current = event.currentTarget
    setActiveMetricKey(metricKey)
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
          {canCreateWorkOrders && <button className={`dashboard-create-button${isCreateButtonCollapsed ? ' is-collapsed' : ''}`} type="button" aria-label="Create work order" onClick={() => onNavigate('/workorders?create=1')}><Plus size={24} aria-hidden="true" /><span>Create</span></button>}
        </div>
        {loadState === 'loading' && <p className="dashboard-section-state" role="status">Loading your work...</p>}
        {loadState === 'ready' && overview?.canViewWorkOrders && <div className="dashboard-work-order-carousel">
          {overview.groups.map((group) => <WorkOrderGroupCard group={group} key={group.id} />)}
        </div>}
        {loadState === 'ready' && !overview?.canViewWorkOrders && <p className="dashboard-section-state">Work Orders are not available for your account.</p>}
      </section>

      <section className="dashboard-section dashboard-activity-section" aria-labelledby="dashboard-activity-title">
        <h2 id="dashboard-activity-title">Recent Activity</h2>
        {loadState === 'loading' && <p className="dashboard-section-state" role="status">Loading recent activity...</p>}
        {loadState === 'ready' && !overview.activityAvailable && <p className="dashboard-section-state">Activity access is not included in your role.</p>}
        {loadState === 'ready' && overview.activityAvailable && overview.recentActivity.length === 0 && <p className="dashboard-section-state">No recent Work Order activity.</p>}
        {loadState === 'ready' && overview.activityAvailable && overview.recentActivity.length > 0 && <ul className="dashboard-activity-list">
          {overview.recentActivity.map((event) => <ActivityRow event={event} timeZone={timeZone} key={event.id} />)}
        </ul>}
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
  </>
}
