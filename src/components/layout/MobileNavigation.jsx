import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from './useWorkspace'
import { getUnreadWorkOrderCount } from '../../services/workOrderService'
import { MobileWorkOrderNavigationActions } from './MobileWorkOrderNavigationActions'
import { useMobileWorkOrderNavigation } from './useMobileWorkOrderNavigation'
import { MobileSettingsSheet } from '../ui/MobileSettingsSheet'
import { getFeatureLabel } from '../../utils/featureLabels'
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Home,
  Menu,
  MessagesCircle,
  Pause,
  Play,
  Settings,
  Square,
  Timer,
} from 'lucide-react'
import './MobileNavigation.css'

const primaryDestinations = [
  { label: 'Overview', page: 'Dashboard', icon: Home },
  { label: 'Work Orders', featureLabelKey: 'workOrder', page: 'Work Orders', icon: ClipboardCheck },
  { label: 'Assets', featureLabelKey: 'asset', page: 'Assets', icon: Boxes },
  { label: 'Messages', page: 'Messages', icon: MessagesCircle },
]

function isPrimaryPage(page, activePage) {
  return activePage === page
}

function formatTimerDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':')
}

const idleTimerState = { status: 'idle', elapsedSeconds: 0, trackingTypeName: 'Work', isSaving: false }

function isWorkOrderRecordPath() {
  if (typeof window === 'undefined') return false
  return /^\/workorders\/[^/]+\/?$/.test(window.location.pathname)
}

export function MobileNavigation({ activePage, onNavigate }) {
  const navigationTabsRef = useRef(null)
  const workspace = useWorkspace()
  const workOrderNavigation = useMobileWorkOrderNavigation()
  const [unreadWorkOrderBadge, setUnreadWorkOrderBadge] = useState(null)
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false)
  const [navigationOverflow, setNavigationOverflow] = useState({ previous: false, next: false })
  const [timerState, setTimerState] = useState(idleTimerState)
  const [workOrderMobileSection, setWorkOrderMobileSection] = useState('details')
  const organizationId = workspace.organization?.id
  const grants = workspace.authorization?.grants
  const canViewWorkOrders = Boolean(grants?.['work_orders.view'])
  const isSettingsContext = activePage === 'Tools' || activePage.startsWith('Settings /')
  const isToolsCurrent = !isSettingsContext && !primaryDestinations.some((item) => isPrimaryPage(item.page, activePage))
  const isWorkOrderDetail = activePage === 'Work Orders'
    && (workOrderNavigation.recordView === 'detail' || isWorkOrderRecordPath())
    && !workOrderNavigation.utilityPage
  const isWorkOrderCommentsContext = isWorkOrderDetail && workOrderMobileSection === 'comments'
  const isWorkOrderTimerContext = isWorkOrderDetail && workOrderMobileSection !== 'comments'
  const unreadWorkOrderCount = canViewWorkOrders && unreadWorkOrderBadge?.organizationId === organizationId
    ? unreadWorkOrderBadge.count
    : null

  useEffect(() => {
    const syncTimerState = (event) => setTimerState({ ...idleTimerState, ...event.detail })
    window.addEventListener('workbench:work-order-timer-state', syncTimerState)
    return () => window.removeEventListener('workbench:work-order-timer-state', syncTimerState)
  }, [])

  useEffect(() => {
    const syncWorkOrderSection = (event) => setWorkOrderMobileSection(event.detail?.section || 'details')
    window.addEventListener('workbench:work-order-mobile-section', syncWorkOrderSection)
    return () => window.removeEventListener('workbench:work-order-mobile-section', syncWorkOrderSection)
  }, [])

  useEffect(() => {
    const tabs = navigationTabsRef.current
    if (!tabs) return undefined

    const updateOverflow = () => {
      const items = tabs.querySelectorAll('.mobile-primary-navigation-item')
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (!firstItem || !lastItem) {
        setNavigationOverflow({ previous: false, next: false })
        return
      }
      const tabsRect = tabs.getBoundingClientRect()
      const lastItemEnd = tabs.scrollLeft + lastItem.getBoundingClientRect().right - tabsRect.left
      setNavigationOverflow({
        previous: tabs.scrollLeft > 2,
        next: lastItemEnd > tabs.scrollLeft + tabs.clientWidth + 2,
      })
    }

    updateOverflow()
    tabs.addEventListener('scroll', updateOverflow, { passive: true })
    window.addEventListener('resize', updateOverflow)
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateOverflow)
    resizeObserver?.observe(tabs)
    return () => {
      tabs.removeEventListener('scroll', updateOverflow)
      window.removeEventListener('resize', updateOverflow)
      resizeObserver?.disconnect()
    }
  }, [])

  useEffect(() => {
    const tabs = navigationTabsRef.current
    if (!tabs || window.getComputedStyle(tabs).overflowX !== 'auto') return
    tabs
      .querySelector('.mobile-primary-navigation-item[aria-current="page"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [activePage])

  useEffect(() => {
    if (!organizationId || !canViewWorkOrders) return undefined

    let active = true
    const loadUnreadCount = () => getUnreadWorkOrderCount({ organizationId, grants })
      .then((count) => { if (active) setUnreadWorkOrderBadge({ organizationId, count }) })
      .catch(() => { if (active) setUnreadWorkOrderBadge({ organizationId, count: null }) })

    void loadUnreadCount()
    window.addEventListener('workbench:unread-work-order-count-invalidated', loadUnreadCount)
    return () => {
      active = false
      window.removeEventListener('workbench:unread-work-order-count-invalidated', loadUnreadCount)
    }
  }, [canViewWorkOrders, grants, organizationId])

  const navigateTo = (page) => {
    workOrderNavigation.reset()
    onNavigate(page)
  }
  const scrollNavigationForward = () => {
    const tabs = navigationTabsRef.current
    if (!tabs) return
    const tabsRect = tabs.getBoundingClientRect()
    const nextItem = [...tabs.querySelectorAll('.mobile-primary-navigation-item')].find((item) =>
      item.getBoundingClientRect().left - tabsRect.left > tabs.clientLeft + 8,
    )
    if (!nextItem) return
    const nextItemLeft = tabs.scrollLeft + nextItem.getBoundingClientRect().left - tabsRect.left - tabs.clientLeft - 4
    tabs.scrollTo({ left: nextItemLeft, behavior: 'smooth' })
  }
  const scrollNavigationBackward = () => {
    const tabs = navigationTabsRef.current
    if (!tabs) return
    const tabsRect = tabs.getBoundingClientRect()
    const previousItem = [...tabs.querySelectorAll('.mobile-primary-navigation-item')]
      .filter((item) => item.getBoundingClientRect().left - tabsRect.left < tabs.clientLeft + 8)
      .at(-1)
    if (!previousItem) return
    const previousItemLeft = tabs.scrollLeft + previousItem.getBoundingClientRect().left - tabsRect.left - tabs.clientLeft - 4
    tabs.scrollTo({ left: previousItemLeft, behavior: 'smooth' })
  }
  const dispatchTimerAction = (action) => {
    window.dispatchEvent(new CustomEvent('workbench:work-order-timer-action', { detail: { action } }))
  }
  const visibleTimerState = isWorkOrderTimerContext ? timerState : idleTimerState
  const timerIsActive = isWorkOrderTimerContext && (visibleTimerState.status === 'running' || visibleTimerState.status === 'paused')

  if (isWorkOrderCommentsContext) return null

  return <nav
    className={`mobile-primary-navigation${activePage === 'Work Orders' ? ' has-work-order-actions' : ''}${workOrderNavigation.utilityPage ? ` is-work-order-${workOrderNavigation.utilityPage}-open` : ''}${workOrderNavigation.recordView ? ' is-work-order-record-view' : ''}${isWorkOrderTimerContext ? ' is-work-order-detail' : ''}${timerIsActive ? ` is-work-order-timer-${visibleTimerState.status}` : ''}`}
    aria-label="Primary navigation"
  >
    {isWorkOrderTimerContext ? (
      timerIsActive ? (
        <div className="mobile-navigation-timer-state" aria-live="polite">
          <div className="mobile-navigation-timer-readout">
            <span>{visibleTimerState.trackingTypeName || 'Work'}</span>
            <strong>{formatTimerDuration(visibleTimerState.elapsedSeconds)}</strong>
          </div>
          <div className="mobile-navigation-timer-controls">
            {visibleTimerState.status === 'running' ? (
              <button className="mobile-navigation-timer-button mobile-navigation-timer-button--pause" type="button" onClick={() => dispatchTimerAction('pause')} disabled={visibleTimerState.isSaving}>
                <Pause size={20} strokeWidth={2.4} aria-hidden="true" />
                <span>Pause</span>
              </button>
            ) : (
              <>
                <button className="mobile-navigation-timer-button mobile-navigation-timer-button--stop" type="button" onClick={() => dispatchTimerAction('stop')} disabled={visibleTimerState.isSaving}>
                  <Square size={18} strokeWidth={2.4} aria-hidden="true" />
                  <span>Stop</span>
                </button>
                <button className="mobile-navigation-timer-button mobile-navigation-timer-button--resume" type="button" onClick={() => dispatchTimerAction('resume')} disabled={visibleTimerState.isSaving}>
                  <Play size={20} strokeWidth={2.4} fill="currentColor" aria-hidden="true" />
                  <span>Resume</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          className="mobile-navigation-timer-action"
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('workbench:work-order-start-timer'))}
          disabled={visibleTimerState.isSaving}
        >
          <Timer size={22} strokeWidth={2} aria-hidden="true" />
          <span>Start Timer</span>
        </button>
      )
    ) : <>
    <MobileWorkOrderNavigationActions activePage={activePage} navigation={workOrderNavigation} position="leading" />
    <button className="mobile-navigation-scroll-back" type="button" aria-label="Show previous navigation options" onClick={scrollNavigationBackward} hidden={!navigationOverflow.previous}>
      <ChevronLeft size={22} strokeWidth={2.4} />
    </button>
    <div className="mobile-primary-navigation-tabs" ref={navigationTabsRef}>
      {primaryDestinations.map(({ label, featureLabelKey, page, icon: Icon }) => (
        <button
          key={page}
          type="button"
          className={`mobile-primary-navigation-item${isPrimaryPage(page, activePage) ? ' is-active' : ''}`}
          aria-current={isPrimaryPage(page, activePage) ? 'page' : undefined}
          aria-label={label === 'Work Orders' && unreadWorkOrderCount > 0 ? `Work Orders, ${unreadWorkOrderCount} unread` : label}
          onClick={() => navigateTo(page)}
        >
          <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
          <span>{featureLabelKey ? getFeatureLabel(workspace.organization?.feature_labels, featureLabelKey) : label}</span>
          {label === 'Work Orders' && unreadWorkOrderCount > 0 && <span className="mobile-navigation-badge" aria-hidden="true">{unreadWorkOrderCount > 99 ? '99+' : unreadWorkOrderCount}</span>}
        </button>
      ))}
      <button
        type="button"
        className={`mobile-primary-navigation-item mobile-primary-navigation-tools${isSettingsContext || isToolsCurrent ? ' is-active' : ''}`}
        aria-label={isSettingsContext ? 'Settings' : 'Tools'}
        aria-current={isSettingsContext || isToolsCurrent ? 'page' : undefined}
        onClick={() => isSettingsContext ? setIsSettingsMenuOpen(true) : navigateTo('Tools')}
      >
        {isSettingsContext ? <Settings size={21} strokeWidth={1.9} aria-hidden="true" /> : <Menu size={21} strokeWidth={1.9} aria-hidden="true" />}
        <span>{isSettingsContext ? 'Settings' : 'Tools'}</span>
      </button>
    </div>
    {activePage === 'Dashboard' && <button className="mobile-navigation-account" type="button" onClick={() => onNavigate('Settings / Profile Preferences')} aria-label="Account">
      <Settings size={26} strokeWidth={1.8} aria-hidden="true" />
      <span>Account</span>
    </button>}
    {isSettingsMenuOpen && <MobileSettingsSheet onClose={() => setIsSettingsMenuOpen(false)} onNavigate={onNavigate} />}
    <button className="mobile-navigation-scroll-forward" type="button" aria-label="Show more navigation options" onClick={scrollNavigationForward} hidden={!navigationOverflow.next}>
      <ChevronRight size={22} strokeWidth={2.4} aria-hidden="true" />
    </button>
    <MobileWorkOrderNavigationActions activePage={activePage} navigation={workOrderNavigation} position="trailing" />
    </>}
  </nav>
}
