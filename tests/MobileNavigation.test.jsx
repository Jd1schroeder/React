import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileNavigation } from '../src/components/layout/MobileNavigation'

const serviceMocks = vi.hoisted(() => ({ getUnreadWorkOrderCount: vi.fn() }))

vi.mock('../src/components/layout/useWorkspace', () => ({
  useWorkspace: () => ({
    profile: { first_name: 'Morgan', last_name: 'Lee', avatar_url: null },
    user: { email: 'morgan@example.com' },
    organization: { id: 'organization-a', name: 'Main shop' },
    organizations: [],
    authorization: { grants: { 'work_orders.view': 'any' } },
  }),
}))

vi.mock('../src/services/workOrderService', () => ({
  getUnreadWorkOrderCount: serviceMocks.getUnreadWorkOrderCount,
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
beforeEach(() => {
  vi.clearAllMocks()
  serviceMocks.getUnreadWorkOrderCount.mockResolvedValue(89)
})

describe('mobile navigation', () => {
  it('routes from the primary navigation', () => {
    const onNavigate = vi.fn()
    render(<MobileNavigation activePage="Work Orders" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Assets' }))

    expect(onNavigate).toHaveBeenCalledWith('Assets')
  })

  it('replaces Work Order calendar and filter actions with record Back and Create controls', async () => {
    render(<MobileNavigation activePage="Work Orders" onNavigate={vi.fn()} />)
    act(() => window.dispatchEvent(new CustomEvent('workbench:work-orders-record-view', { detail: { kind: 'create' } })))

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toHaveClass('is-work-order-record-view')
    expect(screen.queryByRole('button', { name: 'Toggle Work Order calendar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Filter Work Orders' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Work Order' })).toHaveAttribute('form', 'new-work-order-form-create')
    expect(await screen.findByRole('button', { name: 'Work Orders, 89 unread' })).toBeInTheDocument()
  })

  it('keeps Work Order calendar and filter actions in the Work Orders navigation feature', () => {
    const onCalendarToggle = vi.fn()
    const onUtilityPage = vi.fn()
    window.addEventListener('workbench:work-orders-calendar-toggle', onCalendarToggle)
    window.addEventListener('workbench:work-orders-utility-page', onUtilityPage)
    try {
      render(<MobileNavigation activePage="Work Orders" onNavigate={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: 'Toggle Work Order calendar' }))
      fireEvent.click(screen.getByRole('button', { name: 'Filter Work Orders' }))

      expect(onCalendarToggle).toHaveBeenCalledOnce()
      expect(onUtilityPage).toHaveBeenCalledWith(expect.objectContaining({
        detail: { page: 'filters', resetDraft: true },
      }))
      expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toHaveClass('is-work-order-filters-open')
    } finally {
      window.removeEventListener('workbench:work-orders-calendar-toggle', onCalendarToggle)
      window.removeEventListener('workbench:work-orders-utility-page', onUtilityPage)
    }
  })

  it('shows the mobile overview destinations and the live Work Order unread badge', async () => {
    render(<MobileNavigation activePage="Dashboard" onNavigate={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Assets' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Messages' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Work Orders, 89 unread' })).toBeInTheDocument()
    expect(serviceMocks.getUnreadWorkOrderCount).toHaveBeenCalledWith({
      organizationId: 'organization-a',
      grants: { 'work_orders.view': 'any' },
    })
  })

  it('navigates to the More page instead of opening a menu', () => {
    const onNavigate = vi.fn()
    render(<MobileNavigation activePage="Work Orders" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'More' }))

    expect(onNavigate).toHaveBeenCalledWith('More')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('marks More active when a secondary page is active', () => {
    render(<MobileNavigation activePage="Vendors" onNavigate={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-current', 'page')
  })
})
