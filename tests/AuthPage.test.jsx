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

  it('shows a recoverable error when password sign-in fails', async () => {
    authMocks.signInWithPassword.mockRejectedValue(new Error('Invalid credentials'))
    renderLogin()

    await submitLogin()

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
  })

  it('navigates after a successful passkey sign-in', async () => {
    const onNavigate = renderLogin()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with passkey' }))

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('Work Orders'))
  })
})

describe('signup validation and confirmation', () => {
  function renderSignup(onNavigate = vi.fn()) {
    render(<AuthPage mode="signup" onNavigate={onNavigate} />)
    return onNavigate
  }

  function fillSignupPasswords(password, confirmation = password) {
    fireEvent.change(screen.getByPlaceholderText('Enter your organization name'), { target: { value: 'Acme Corp' } })
    fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: password } })
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: confirmation } })
    fireEvent.change(screen.getByPlaceholderText('Enter your work email'), { target: { value: 'josh@example.com' } })
  }

  it('rejects mismatched passwords before calling Supabase', async () => {
    renderSignup()
    fillSignupPasswords('one-password', 'different-password')

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.')
    expect(authMocks.signUpWithOrganization).not.toHaveBeenCalled()
  })

  it('routes unconfirmed signup results to email verification', async () => {
    authMocks.signUpWithOrganization.mockResolvedValue({ session: null })
    const onNavigate = renderSignup()
    fillSignupPasswords('example-password')

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('Verify Email'))
  })
})
