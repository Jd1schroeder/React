import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWorkspace } from './useWorkspace'
import { settingsNavigation, settingsPageByLabel, sidebarGroups } from './sidebarConfig'
import { setActiveOrganization } from '../../services/workspaceService'
import { supabase } from '../../lib/supabase'
import { getUnreadWorkOrderCount } from '../../services/workOrderService'
import { Avatar } from '../ui/Avatar'
import { useMobileSheetDismiss } from './useMobileSheetDismiss'
import {
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Home,
  House,
  Filter,
  LogOut,
  MessageCircle,
  Search,
  X,
} from 'lucide-react'
import './MobileNavigation.css'

const primaryDestinations = [
  { label: 'Overview', page: 'Dashboard', icon: Home },
  { label: 'Work Orders', page: 'Work Orders', icon: ClipboardCheck },
  { label: 'Assets', page: 'Assets', icon: Boxes },
  { label: 'Messages', page: 'Messages', icon: MessageCircle },
]

function isPrimaryPage(page, activePage) {
  return activePage === page
}

export function MobileNavigation({ activePage, onNavigate }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const moreButtonRef = useRef(null)
  const navigationTabsRef = useRef(null)
  const workspace = useWorkspace()
  const [unreadWorkOrderBadge, setUnreadWorkOrderBadge] = useState(null)
  const [navigationOverflow, setNavigationOverflow] = useState({ previous: false, next: false })
  const [areWorkOrderFiltersOpen, setAreWorkOrderFiltersOpen] = useState(false)
  const organizationId = workspace.organization?.id
  const grants = workspace.authorization?.grants
  const canViewWorkOrders = Boolean(grants?.['work_orders.view'])
  const closeMoreMenu = useCallback(() => setIsMoreOpen(false), [])
  const sheetDismiss = useMobileSheetDismiss(closeMoreMenu, dialogRef)
  const unreadWorkOrderCount = canViewWorkOrders && unreadWorkOrderBadge?.organizationId === organizationId
    ? unreadWorkOrderBadge.count
    : null
  const query = search.trim().toLocaleLowerCase()
  const visibleGroups = useMemo(() => sidebarGroups.map((group) => ({
    ...group,
    items: group.items.flatMap((item) => {
      const children = item.children?.filter((child) => !query || child.label.toLocaleLowerCase().includes(query))
      const matches = !query || item.label.toLocaleLowerCase().includes(query) || children?.length > 0
      return matches ? [{ ...item, children: query && !item.label.toLocaleLowerCase().includes(query) ? children : item.children }] : []
    }),
  })).filter((group) => !query || group.items.length > 0), [query])
  const isMoreCurrent = !primaryDestinations.some((item) => isPrimaryPage(item.page, activePage))

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
      .querySelector('.tablet-navigation-item[aria-current="page"], .mobile-primary-navigation-item[aria-current="page"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [activePage])

  useEffect(() => {
    if (!organizationId || !canViewWorkOrders) {
      return undefined
    }
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

  useEffect(() => {
    if (!isMoreOpen) return undefined
    const moreButton = moreButtonRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMoreOpen(false)
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]')]
      if (focusable.length === 0) return
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
      if (moreButton?.isConnected) moreButton.focus()
    }
  }, [isMoreOpen])

  const navigateTo = (page) => {
    setIsMoreOpen(false)
    setSearch('')
    setAreWorkOrderFiltersOpen(false)
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
  const handleSignOut = async () => {
    setIsMoreOpen(false)
    await supabase.auth.signOut()
    onNavigate('Login')
  }

  const firstName = workspace.profile?.first_name || workspace.user?.user_metadata?.first_name || ''
  const lastName = workspace.profile?.last_name || workspace.user?.user_metadata?.last_name || ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || workspace.user?.email || 'Account'

  return <>
    <nav className="mobile-primary-navigation" aria-label="Primary navigation">
      {activePage === 'Work Orders' && <button className="mobile-navigation-work-order-action is-calendar" type="button" disabled aria-label="Calendar view coming soon" title="Calendar view coming soon"><CalendarDays size={23} aria-hidden="true" /></button>}
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
          ref={moreButtonRef}
          type="button"
          className={`mobile-primary-navigation-item mobile-primary-navigation-more${isMoreOpen || isMoreCurrent ? ' is-active' : ''}`}
          aria-label="More modules and settings"
          aria-expanded={isMoreOpen}
          onClick={() => setIsMoreOpen(true)}
        >
          <span>More</span>
        </button>
      </div>
      <button className="mobile-navigation-scroll-forward" type="button" aria-label="Show more navigation options" onClick={scrollNavigationForward} hidden={!navigationOverflow.next}>
        <ChevronRight size={22} strokeWidth={2.4} aria-hidden="true" />
      </button>
      {activePage === 'Work Orders' && <button
        className="mobile-navigation-work-order-action is-filter"
        type="button"
        aria-label="Toggle Work Order filters"
        aria-expanded={areWorkOrderFiltersOpen}
        onClick={() => {
          const isOpen = !areWorkOrderFiltersOpen
          setAreWorkOrderFiltersOpen(isOpen)
          window.dispatchEvent(new CustomEvent('workbench:work-orders-toggle-filters', { detail: { isOpen } }))
        }}
      ><Filter size={23} aria-hidden="true" /></button>}
    </nav>
    {isMoreOpen && createPortal(
      <div className={`mobile-navigation-backdrop mobile-sheet-backdrop ${sheetDismiss.backdropClassName}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsMoreOpen(false) }}>
        <section ref={dialogRef} className={`mobile-navigation-sheet mobile-edge-to-edge-sheet ${sheetDismiss.dragClassName}`} onTransitionEnd={sheetDismiss.onTransitionEnd} role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title">
          <header className="mobile-navigation-sheet-header mobile-sheet-drag-handle" {...sheetDismiss.dragHandleProps}>
            <div>
              <p>Workbench</p>
              <h2 id="mobile-navigation-title">Modules and settings</h2>
            </div>
            <button ref={closeButtonRef} className="mobile-navigation-close" type="button" aria-label="Close navigation" onClick={() => setIsMoreOpen(false)}><X size={22} /></button>
          </header>
          <label className="mobile-navigation-search">
            <Search size={19} aria-hidden="true" />
            <span className="mobile-navigation-visually-hidden">Search modules</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a module" />
          </label>
          <div className="mobile-navigation-sheet-scroll">
            {(!query || 'dashboard'.includes(query)) && <section className="mobile-navigation-group">
              <h3>Home</h3>
              <button type="button" className="mobile-navigation-link" onClick={() => navigateTo('Dashboard')}><House size={18} aria-hidden="true" /><span>Dashboard</span></button>
            </section>}
            {visibleGroups.map((group) => <section className="mobile-navigation-group" key={group.label}>
              <h3>{group.label}</h3>
              {group.items.map((item) => {
                const Icon = item.icon
                return <div key={item.page}>
                  <button type="button" className={`mobile-navigation-link${activePage === item.page ? ' is-current' : ''}`} aria-current={activePage === item.page ? 'page' : undefined} onClick={() => navigateTo(item.page)}>
                    {Icon ? <Icon size={18} aria-hidden="true" /> : <span className="mobile-navigation-link-spacer" aria-hidden="true" />}
                    <span>{item.label}</span>
                    {activePage === item.page && <Check className="mobile-navigation-current-icon" size={18} aria-hidden="true" />}
                  </button>
                  {item.children?.map((child) => <button type="button" key={child.page} className={`mobile-navigation-link is-nested${activePage === child.page ? ' is-current' : ''}`} aria-current={activePage === child.page ? 'page' : undefined} onClick={() => navigateTo(child.page)}><span className="mobile-navigation-link-spacer" aria-hidden="true" /><span>{child.label}</span>{activePage === child.page && <Check className="mobile-navigation-current-icon" size={18} aria-hidden="true" />}</button>)}
                </div>
              })}
            </section>)}
            {visibleGroups.length === 0 && <p className="mobile-navigation-empty">No modules match “{search}”.</p>}
            <section className="mobile-navigation-group">
              <h3>Organization settings</h3>
              {settingsNavigation.organization.map((label) => <button type="button" className="mobile-navigation-link" key={label} onClick={() => navigateTo(settingsPageByLabel[label])}><span className="mobile-navigation-link-spacer" aria-hidden="true" /><span>{label}</span></button>)}
            </section>
            <section className="mobile-navigation-group">
              <h3>Your account</h3>
              {settingsNavigation.personal.map((label) => <button type="button" className="mobile-navigation-link" key={label} onClick={() => navigateTo(settingsPageByLabel[label])}><span className="mobile-navigation-link-spacer" aria-hidden="true" /><span>{label}</span></button>)}
              <div className="mobile-navigation-account"><Avatar src={workspace.profile?.avatar_url} firstName={firstName} lastName={lastName} alt="" /><span>{displayName}</span></div>
            </section>
            {workspace.organizations?.length > 1 && <label className="mobile-navigation-workspace">
              <span>Workspace</span>
              <span className="mobile-navigation-workspace-select"><select aria-label="Workspace" value={workspace.organization?.id ?? ''} onChange={(event) => setActiveOrganization(event.target.value)}>{workspace.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select><ChevronDown size={17} aria-hidden="true" /></span>
            </label>}
            <button type="button" className="mobile-navigation-signout" onClick={() => { void handleSignOut() }}><LogOut size={18} aria-hidden="true" /> Sign out</button>
          </div>
        </section>
      </div>, document.body,
    )}
  </>
}
