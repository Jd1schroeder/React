import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamsPage } from '../src/pages/TeamsPage'
import { listOrganizationTeams } from '../src/services/organizationService'

vi.mock('../src/components/layout/PanelLayout', () => ({
  PanelLayout: ({ children, title, onSearch, searchValue, onAction, actionLabel, subnavigation }) => <main><h1>{title}</h1>{subnavigation}<input aria-label="Team search" value={searchValue} onChange={(event) => onSearch(event.target.value)} /><button type="button" onClick={onAction}>{actionLabel}</button>{children}</main>,
}))
vi.mock('../src/components/layout/useWorkspace', () => ({ useWorkspace: () => ({ organization: { id: 'organization-a', feature_labels: {} } }) }))
vi.mock('../src/services/organizationService', () => ({ listOrganizationTeams: vi.fn() }))

describe('TeamsPage', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    listOrganizationTeams.mockResolvedValue([
      { id: 'team-a', name: 'Engineering', color: '#1887fc', memberCount: 4, administrator: { first_name: 'Joshua', last_name: 'Schroeder' } },
      { id: 'team-b', name: 'Maintenance', color: '#7c5ce6', memberCount: 1, administrator: null },
    ])
  })

  it('loads teams with administrators and member counts', async () => {
    const onNavigate = vi.fn()
    render(<TeamsPage onNavigate={onNavigate} />)

    expect(await screen.findByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Joshua Schroeder')).toBeInTheDocument()
    expect(screen.getByText('4 Members')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Engineering' }))
    expect(onNavigate).toHaveBeenCalledWith('/teams/team-a')
    const actionsButton = screen.getByRole('button', { name: 'Actions for Engineering' })
    expect(actionsButton).toBeEnabled()
    fireEvent.click(actionsButton)
    const detailsAction = screen.getByRole('menuitem', { name: 'See Details' })
    expect(detailsAction).toBeEnabled()
    fireEvent.click(detailsAction)
    expect(onNavigate).toHaveBeenCalledWith('/teams/team-a')
    expect(screen.getByRole('menuitem', { name: 'Invite Members' })).toBeEnabled()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Invite Members' }))
    expect(onNavigate).toHaveBeenCalledWith('/teams/team-a/addmembers')
    expect(screen.getByRole('menuitem', { name: 'Send Message' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeDisabled()
  })

  it('filters teams and navigates to create', async () => {
    const onNavigate = vi.fn()
    render(<TeamsPage onNavigate={onNavigate} />)

    await screen.findByText('Engineering')
    fireEvent.change(screen.getByRole('textbox', { name: 'Team search' }), { target: { value: 'maint' } })
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
    expect(screen.getByText('Maintenance')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /create team/i }))
    expect(onNavigate).toHaveBeenCalledWith('/teams/create')
  })

  it('uses sortable shared table headers for team columns', async () => {
    render(<TeamsPage onNavigate={vi.fn()} />)

    await screen.findByText('Engineering')
    const nameHeader = screen.getByRole('button', { name: 'Name' })
    expect(nameHeader).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Administrator' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Members' })).toBeInTheDocument()

    fireEvent.click(nameHeader)
    expect(nameHeader.querySelector('.lucide-arrow-down')).toBeInTheDocument()
  })
})
