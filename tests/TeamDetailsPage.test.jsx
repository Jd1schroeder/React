import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamDetailsPage } from '../src/pages/TeamDetailsPage'
import { addOrganizationTeamMembers, listOrganizationMembers, listOrganizationTeams, updateOrganizationTeamMemberRole } from '../src/services/organizationService'

vi.mock('../src/components/layout/useWorkspace', () => ({ useWorkspace: () => ({ organization: { id: 'organization-a' }, preferences: {} }) }))
vi.mock('../src/services/organizationService', () => ({ addOrganizationTeamMembers: vi.fn(), listOrganizationMembers: vi.fn(), listOrganizationTeams: vi.fn(), removeOrganizationTeamMember: vi.fn(), updateOrganizationTeamMemberRole: vi.fn() }))

describe('TeamDetailsPage', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    listOrganizationTeams.mockResolvedValue([{ id: 'team-a', name: 'Engineering', description: 'Keeps equipment running.', color: '#3bc4bc', created_by: 'user-a', memberIds: ['user-a', 'user-b', 'user-c', 'user-d'] }])
    listOrganizationMembers.mockResolvedValue([
      { user_id: 'user-a', profile: { first_name: 'Joshua', last_name: 'Schroeder' }, last_sign_in_at: null },
      { user_id: 'user-b', profile: { first_name: 'Wyatt', last_name: 'Atchison' }, last_sign_in_at: null },
      { user_id: 'user-c', profile: { first_name: 'Steve', last_name: 'Huddleston' }, last_sign_in_at: null },
      { user_id: 'user-d', profile: { first_name: 'Charlie', last_name: 'Shindeldecker' }, last_sign_in_at: null },
    ])
    addOrganizationTeamMembers.mockResolvedValue([{ team_id: 'team-a', user_id: 'user-c' }])
    updateOrganizationTeamMemberRole.mockResolvedValue({ team_id: 'team-a', user_id: 'user-a', role: 'member' })
  })

  it('renders team identity and members from persisted team membership', async () => {
    render(<TeamDetailsPage recordId="team-a" onNavigate={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Engineering' })).toBeInTheDocument()
    expect(screen.getByText('Joshua Schroeder')).toBeInTheDocument()
    expect(screen.getAllByText('Team Administrator')[0]).toBeInTheDocument()
    expect(screen.getByText('Wyatt Atchison')).toBeInTheDocument()
    expect(screen.getByText('Keeps equipment running.')).toBeInTheDocument()
    expect(screen.getByText('Locations (0)')).toBeInTheDocument()
  })

  it('opens the add members route modal and adds selected organization members', async () => {
    const onNavigate = vi.fn()
    listOrganizationTeams.mockResolvedValue([{ id: 'team-a', name: 'Engineering', description: 'Keeps equipment running.', color: '#3bc4bc', created_by: 'user-a', memberIds: ['user-a', 'user-b'] }])
    render(<TeamDetailsPage recordId="team-a" onNavigate={onNavigate} isTeamAddMembers />)

    expect(await screen.findByRole('heading', { name: 'Add Members to the Team' })).toBeInTheDocument()
    fireEvent.focus(screen.getByRole('combobox', { name: 'Add Members to the Team' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Steve Huddleston' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Members' }).at(-1))

    await waitFor(() => expect(addOrganizationTeamMembers).toHaveBeenCalledWith({ organizationId: 'organization-a', teamId: 'team-a', userIds: ['user-c'] }))
    expect(screen.queryByRole('heading', { name: 'Add Members to the Team' })).not.toBeInTheDocument()
    expect(onNavigate).toHaveBeenCalledWith('/teams/team-a')
  })

  it('shows the member preview and row actions', async () => {
    const onNavigate = vi.fn()
    render(<TeamDetailsPage recordId="team-a" onNavigate={onNavigate} />)

    expect(await screen.findByText('See all Members')).toBeInTheDocument()
    expect(screen.queryByText('Charlie Shindeldecker')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Joshua Schroeder' }))

    expect(screen.getByRole('menuitem', { name: 'Send Message' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Send Message' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'See Account' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Remove from Team' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove from Team' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Are you sure you want to remove Joshua Schroeder from Engineering?')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu', { name: 'Joshua Schroeder actions' })).not.toBeInTheDocument()
  })

  it('allows the role to be changed from the member row', async () => {
    render(<TeamDetailsPage recordId="team-a" onNavigate={vi.fn()} />)

    const roleSelect = await screen.findByRole('button', { name: 'Role for Joshua Schroeder' })
    expect(roleSelect).toHaveTextContent('Team Administrator')
    fireEvent.click(roleSelect)
    fireEvent.click(screen.getByRole('option', { name: 'Member' }))

    await waitFor(() => expect(updateOrganizationTeamMemberRole).toHaveBeenCalledWith({ organizationId: 'organization-a', teamId: 'team-a', userId: 'user-a', role: 'member' }))
    expect(roleSelect).toHaveTextContent('Member')
  })
})
