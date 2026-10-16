import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamCreatePage } from '../src/pages/TeamCreatePage'
import { createOrganizationTeam, listOrganizationTeams, updateOrganizationTeam } from '../src/services/organizationService'

vi.mock('../src/services/organizationService', () => ({
  createOrganizationTeam: vi.fn(),
  listOrganizationTeams: vi.fn(),
  updateOrganizationTeam: vi.fn(),
}))
vi.mock('../src/components/layout/useWorkspace', () => ({ useWorkspace: () => ({ organization: { id: 'organization-a' } }) }))

describe('TeamCreatePage', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    createOrganizationTeam.mockResolvedValue({ id: 'team-a' })
    listOrganizationTeams.mockResolvedValue([])
    updateOrganizationTeam.mockResolvedValue({ id: 'team-a' })
  })

  it('requires a name and persists team metadata before returning to teams', async () => {
    const onNavigate = vi.fn()
    render(<TeamCreatePage onNavigate={onNavigate} />)

    expect(screen.getByRole('button', { name: 'Create Team' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: /team name/i }), { target: { value: 'Engineering' } })
    fireEvent.change(screen.getByRole('textbox', { name: /description/i }), { target: { value: 'Keeps equipment running.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Work Order Overdue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Team' }))

    await waitFor(() => expect(createOrganizationTeam).toHaveBeenCalledWith({
      organizationId: 'organization-a',
      name: 'Engineering',
      description: 'Keeps equipment running.',
      color: '#1887fc',
      isEscalationTeam: true,
      escalationEvents: ['work_order_overdue'],
    }))
    expect(onNavigate).toHaveBeenCalledWith('/teams')
  })

  it('updates an existing team and returns to its details page', async () => {
    listOrganizationTeams.mockResolvedValue([{
      id: 'team-a',
      name: 'Engineering',
      description: 'Keeps equipment running.',
      color: '#7c5ce6',
      escalation_events: ['critical_parts'],
    }])
    const onNavigate = vi.fn()
    render(<TeamCreatePage onNavigate={onNavigate} recordId="team-a" />)

    await waitFor(() => expect(screen.getByRole('textbox', { name: /team name/i })).toHaveValue('Engineering'))
    fireEvent.change(screen.getByRole('textbox', { name: /description/i }), { target: { value: 'Updated description.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(updateOrganizationTeam).toHaveBeenCalledWith({
      organizationId: 'organization-a',
      teamId: 'team-a',
      name: 'Engineering',
      description: 'Updated description.',
      color: '#7c5ce6',
      isEscalationTeam: true,
      escalationEvents: ['critical_parts'],
    }))
    expect(onNavigate).toHaveBeenCalledWith('/teams/team-a')
  })
})
