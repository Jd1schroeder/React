import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Login } from '../src/pages/Login'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPasskey: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithOrganization: vi.fn(),
}))

vi.mock('../src/lib/supabase', () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}))

vi.mock('../src/services/authService', () => ({
  signInWithPasskey: mocks.signInWithPasskey,
  signInWithPassword: mocks.signInWithPassword,
  signUpWithOrganization: mocks.signUpWithOrganization,
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
})

describe('authenticated login redirect', () => {
  it('redirects a user with a persisted session to the normal desktop landing page', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null })
    const onNavigate = vi.fn()

    render(<Login onNavigate={onNavigate} />)

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('Work Orders'))
    expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument()
  })

  it('uses the mobile landing page when a persisted session is present on a small viewport', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null })
    const onNavigate = vi.fn()

    render(<Login onNavigate={onNavigate} />)

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('Dashboard'))
  })

  it('prioritizes a pending invitation when redirecting an authenticated user', async () => {
    window.sessionStorage.setItem('workbench.pendingInviteToken', 'invite-token')
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null })
    const onNavigate = vi.fn()

    render(<Login onNavigate={onNavigate} />)

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('Accept Invite'))
  })

  it('shows the login form when there is no persisted session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<Login onNavigate={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('does not block the login form when session lookup fails', async () => {
    mocks.getSession.mockRejectedValue(new Error('Auth service unavailable'))

    render(<Login onNavigate={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })
})
