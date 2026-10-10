import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileAppHeader } from '../src/components/layout/MobileAppHeader'

vi.mock('../src/components/layout/useWorkspace', () => ({
  useWorkspace: () => ({ organization: { name: 'Simona PMC' } }),
}))

afterEach(cleanup)

describe('mobile app header', () => {
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
})
