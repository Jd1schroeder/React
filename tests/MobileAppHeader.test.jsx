import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileAppHeader } from '../src/components/layout/MobileAppHeader'
import { authenticatedRoutes, pages } from '../src/routes/routeConfig'

vi.mock('../src/components/layout/useWorkspace', () => ({
  useWorkspace: () => ({ organization: { name: 'Simona PMC' } }),
}))

afterEach(cleanup)

describe('mobile app header', () => {
  it('registers Edit Account to the shared settings page', () => {
    expect(pages['Settings / Edit Account']).toBe(pages['Settings / Profile Preferences'])
  })

  it('registers Linked Device as a session detail settings route', () => {
    expect(pages['Settings / Linked Device']).toBe(pages['Settings / Profile Preferences'])
    expect(authenticatedRoutes).toContainEqual({
      page: 'Settings / Linked Device',
      path: '/settings/profile-preferences/sessions/:sessionId',
    })
  })

  it('opens My Account from the account button', () => {
    const onNavigate = vi.fn()
    render(<MobileAppHeader activePage="Dashboard" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Account' }))

    expect(onNavigate).toHaveBeenCalledWith('Settings / Profile Preferences')
  })

  it('shows the My Account header and returns through the supplied back action', () => {
    const onNavigateBack = vi.fn()
    render(<MobileAppHeader activePage="Settings / Profile Preferences" onNavigateBack={onNavigateBack} />)

    expect(screen.getByText('My Account')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onNavigateBack).toHaveBeenCalledOnce()
  })

  it('shows an Edit Account title with the same account-page back action', () => {
    const onNavigateBack = vi.fn()
    render(<MobileAppHeader activePage="Settings / Edit Account" onNavigateBack={onNavigateBack} />)

    expect(screen.getByRole('heading', { name: 'Edit Account' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onNavigateBack).toHaveBeenCalledOnce()
  })

  it('shows a Linked Device title with the same account-page back action', () => {
    const onNavigateBack = vi.fn()
    render(<MobileAppHeader activePage="Settings / Linked Device" onNavigateBack={onNavigateBack} />)

    expect(screen.getByRole('heading', { name: 'Linked Device' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onNavigateBack).toHaveBeenCalledOnce()
  })
})
