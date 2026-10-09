import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

vi.mock('../src/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn() } },
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

  it('shows the mobile overview destinations and the live Work Order unread badge', async () => {
    render(<MobileNavigation activePage="Dashboard" onNavigate={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Assets' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Messages' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More modules and settings' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Work Orders, 89 unread' })).toBeInTheDocument()
    expect(serviceMocks.getUnreadWorkOrderCount).toHaveBeenCalledWith({
      organizationId: 'organization-a',
      grants: { 'work_orders.view': 'any' },
    })
  })

  it('searches all modules from the More sheet and closes after navigation', () => {
    const onNavigate = vi.fn()
    render(<MobileNavigation activePage="Work Orders" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'More modules and settings' }))
    expect(screen.getByRole('dialog', { name: 'Modules and settings' })).toHaveClass('mobile-edge-to-edge-sheet')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search modules' }), { target: { value: 'Asset Health' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asset Health' }))

    expect(onNavigate).toHaveBeenCalledWith('Reporting / Asset Health')
    expect(screen.queryByRole('dialog', { name: 'Modules and settings' })).not.toBeInTheDocument()
  })

  it('closes the More sheet on Escape', () => {
    render(<MobileNavigation activePage="Dashboard" onNavigate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'More modules and settings' }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Modules and settings' })).not.toBeInTheDocument()
  })

  it('dismisses the More sheet with a downward header pull on mobile', () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: query === '(max-width: 840px)' })))
    render(<MobileNavigation activePage="Dashboard" onNavigate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'More modules and settings' }))
    const sheet = screen.getByRole('dialog', { name: 'Modules and settings' })
    const header = sheet.querySelector('.mobile-navigation-sheet-header')
    fireEvent.touchStart(header, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(header, { touches: [{ clientY: 160 }] })
    expect(sheet.style.getPropertyValue('--mobile-sheet-drag-offset')).toBe('60px')
    fireEvent.touchEnd(header, { changedTouches: [{ clientY: 160 }] })

    expect(sheet).toHaveClass('is-mobile-sheet-dismissing')
    expect(screen.getByRole('dialog', { name: 'Modules and settings' })).toBeInTheDocument()
    fireEvent.transitionEnd(sheet, { propertyName: 'transform' })
    expect(screen.queryByRole('dialog', { name: 'Modules and settings' })).not.toBeInTheDocument()
  })

  it('snaps the More sheet back after a pull that is too short to dismiss it', () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: query === '(max-width: 840px)' })))
    render(<MobileNavigation activePage="Dashboard" onNavigate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'More modules and settings' }))
    const sheet = screen.getByRole('dialog', { name: 'Modules and settings' })
    const header = sheet.querySelector('.mobile-navigation-sheet-header')
    fireEvent.touchStart(header, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(header, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(header, { changedTouches: [{ clientY: 120 }] })

    expect(sheet).toHaveClass('is-mobile-sheet-snapping-back')
    fireEvent.transitionEnd(sheet, { propertyName: 'transform' })
    expect(sheet).not.toHaveClass('is-mobile-sheet-snapping-back')
    expect(sheet.style.getPropertyValue('--mobile-sheet-drag-offset')).toBe('0px')
    expect(screen.getByRole('dialog', { name: 'Modules and settings' })).toBeInTheDocument()
  })
})
