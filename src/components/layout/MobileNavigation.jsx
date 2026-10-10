import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from './useWorkspace'
import { getUnreadWorkOrderCount } from '../../services/workOrderService'
import { MobileWorkOrderNavigationActions } from './MobileWorkOrderNavigationActions'
import { useMobileWorkOrderNavigation } from './useMobileWorkOrderNavigation'
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Home,
  Menu,
  MessagesCircle,
} from 'lucide-react'
import './MobileNavigation.css'

const primaryDestinations = [
  { label: 'Overview', page: 'Dashboard', icon: Home },
  { label: 'Work Orders', page: 'Work Orders', icon: ClipboardCheck },
  { label: 'Assets', page: 'Assets', icon: Boxes },
  { label: 'Messages', page: 'Messages', icon: MessagesCircle },
]

function isPrimaryPage(page, activePage) {
  return activePage === page
}

export function MobileNavigation({ activePage, onNavigate }) {
  const navigationTabsRef = useRef(null)
  const workspace = useWorkspace()
  const workOrderNavigation = useMobileWorkOrderNavigation()
  const [unreadWorkOrderBadge, setUnreadWorkOrderBadge] = useState(null)
  const [navigationOverflow, setNavigationOverflow] = useState({ previous: false, next: false })
  const organizationId = workspace.organization?.id
  const grants = workspace.authorization?.grants
  const canViewWorkOrders = Boolean(grants?.['work_orders.view'])
  const isMoreCurrent = !primaryDestinations.some((item) => isPrimaryPage(item.page, activePage))
  const unreadWorkOrderCount = canViewWorkOrders && unreadWorkOrderBadge?.organizationId === organizationId
    ? unreadWorkOrderBadge.count
    : null

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

  return <nav
    className={`mobile-primary-navigation${workOrderNavigation.utilityPage ? ` is-work-order-${workOrderNavigation.utilityPage}-open` : ''}${workOrderNavigation.recordView ? ' is-work-order-record-view' : ''}`}
    aria-label="Primary navigation"
  >
    <MobileWorkOrderNavigationActions activePage={activePage} navigation={workOrderNavigation} position="leading" />
    <button className="mobile-navigation-scroll-back" type="button" aria-label="Show previous navigation options" onClick={scrollNavigationBackward} hidden={!navigationOverflow.previous}>
      <ChevronLeft size={22} strokeWidth={2.4} />
    </button>
    <div className="mobile-primary-navigation-tabs" ref={navigationTabsRef}>
      {primaryDestinations.map(({ label, page, icon: Icon }) => (
        <button
          key={page}
          type="button"
          className={`mobile-primary-navigation-item${isPrimaryPage(page, activePage) ? ' is-active' : ''}`}
          aria-current={isPrimaryPage(page, activePage) ? 'page' : undefined}
          aria-label={label === 'Work Orders' && unreadWorkOrderCount > 0 ? `Work Orders, ${unreadWorkOrderCount} unread` : label}
          onClick={() => navigateTo(page)}
        >
          <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
          <span>{label}</span>
          {label === 'Work Orders' && unreadWorkOrderCount > 0 && <span className="mobile-navigation-badge" aria-hidden="true">{unreadWorkOrderCount > 99 ? '99+' : unreadWorkOrderCount}</span>}
        </button>
      ))}
      <button
        type="button"
        className={`mobile-primary-navigation-item mobile-primary-navigation-more${isMoreCurrent ? ' is-active' : ''}`}
        aria-label="More"
        aria-current={isMoreCurrent ? 'page' : undefined}
        onClick={() => navigateTo('More')}
      >
        <Menu size={21} strokeWidth={1.9} aria-hidden="true" />
        <span>More</span>
      </button>
    </div>
    <button className="mobile-navigation-scroll-forward" type="button" aria-label="Show more navigation options" onClick={scrollNavigationForward} hidden={!navigationOverflow.next}>
      <ChevronRight size={22} strokeWidth={2.4} aria-hidden="true" />
    </button>
    <MobileWorkOrderNavigationActions activePage={activePage} navigation={workOrderNavigation} position="trailing" />
  </nav>
}
