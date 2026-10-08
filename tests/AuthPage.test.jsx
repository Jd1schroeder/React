import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthPage } from '../src/pages/AuthPage'

const authMocks = vi.hoisted(() => ({
  signInWithPasskey: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithOrganization: vi.fn(),
}))

vi.mock('../src/services/authService', () => ({
  signInWithPasskey: authMocks.signInWithPasskey,
  signInWithPassword: authMocks.signInWithPassword,
  signUpWithOrganization: authMocks.signUpWithOrganization,
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  authMocks.signInWithPassword.mockResolvedValue({})
  authMocks.signInWithPasskey.mockResolvedValue({})
})

function renderLogin(onNavigate = vi.fn()) {
  render(<AuthPage onNavigate={onNavigate} />)
  return onNavigate
}

async function submitLogin() {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'josh@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'example-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('post-authentication navigation', () => {
  it('lands on Overview after signing in on a mobile viewport', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    const onNavigate = renderLogin()

    await submitLogin()

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('Dashboard'))
  })

  it('preserves the Work Orders landing page on desktop', async () => {
    const onNavigate = renderLogin()

    await submitLogin()

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('Work Orders'))
  })

  it('continues to prioritize a pending invitation on mobile', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    window.sessionStorage.setItem('workbench.pendingInviteToken', 'invite-token')
    const onNavigate = renderLogin()

    await submitLogin()

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('Accept Invite'))
  })
})
