import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileNavigation } from '../src/components/layout/MobileNavigation'

vi.mock('../src/components/layout/useWorkspace', () => ({
  useWorkspace: () => ({
    profile: { first_name: 'Morgan', last_name: 'Lee', avatar_url: null },
    user: { email: 'morgan@example.com' },
    organization: { id: 'organization-a', name: 'Main shop' },
    organizations: [],
  }),
}))

vi.mock('../src/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}))

afterEach(cleanup)

describe('mobile navigation', () => {
  it('routes from the primary navigation', () => {
    const onNavigate = vi.fn()
    render(<MobileNavigation activePage="Work Orders" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Assets' }))

    expect(onNavigate).toHaveBeenCalledWith('Assets')
  })

  it('searches all modules from the More sheet and closes after navigation', () => {
    const onNavigate = vi.fn()
    render(<MobileNavigation activePage="Work Orders" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'More modules and settings' }))
    expect(screen.getByRole('dialog', { name: 'Modules and settings' })).toBeInTheDocument()
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
})
