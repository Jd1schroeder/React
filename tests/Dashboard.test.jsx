import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from '../src/pages/Dashboard'

const dashboardMocks = vi.hoisted(() => ({
  getDashboardOverview: vi.fn(),
  workspace: {
    organization: { id: 'organization-1', name: 'Simona PMC' },
    profile: { first_name: 'Joshua' },
    user: { id: 'user-1', user_metadata: { first_name: 'Joshua' } },
    preferences: { timezone: 'America/New_York' },
    authorization: { grants: {
      'work_orders.view': 'any',
      'work_orders.create': 'any',
      'organization.invite_users': 'any',
    } },
  },
}))

vi.mock('../src/components/layout/useWorkspace', () => ({
  useWorkspace: () => dashboardMocks.workspace,
}))

vi.mock('../src/services/dashboardService', () => ({
  getDashboardOverview: dashboardMocks.getDashboardOverview,
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  dashboardMocks.getDashboardOverview.mockResolvedValue({
    canViewWorkOrders: true,
    metrics: { highPriorityCount: 30, overdueCount: 0, dueTodayCount: 4, completedCount: 99 },
    groups: [{
      id: 'assigned-to-me',
      label: 'Assigned to Me',
      count: 1,
      workOrders: [{
        id: 'work-order-1',
        title: 'Pump inspection',
        work_order_number: 17497,
        status: 'Open',
        priority: 'High',
      }],
    }],
    recentActivity: [],
    activityAvailable: true,
  })
})

function renderDashboard(onNavigate = vi.fn()) {
  render(<MemoryRouter><Dashboard onNavigate={onNavigate} /></MemoryRouter>)
  return onNavigate
}

describe('mobile Overview dashboard', () => {
  it('greets the signed-in user and renders live work-order cards', async () => {
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })).toBeInTheDocument()
    expect(screen.getByText(/Joshua!/)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Pump inspection/ })).toHaveAttribute('href', '/workorders/work-order-1')
    expect(screen.getByText('99')).toBeInTheDocument()
    expect(screen.getByText('Requests Pending Approval (coming soon)')).toBeInTheDocument()
  })

  it('uses the QR scan icon and keeps the not-yet-supported action disabled', async () => {
    renderDashboard()
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    const scanAction = screen.getByRole('button', { name: /Scan Code/ })
    expect(scanAction).toBeDisabled()
    expect(scanAction.querySelector('svg')).toHaveClass('lucide-scan-qr-code')
  })

  it('routes due-today and create actions to functional Work Order views', async () => {
    const onNavigate = renderDashboard()
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    fireEvent.click(screen.getByRole('button', { name: /Due Today/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create work order' }))

    expect(onNavigate).toHaveBeenNthCalledWith(1, '/workorders?dashboardFilter=due-today')
    expect(onNavigate).toHaveBeenNthCalledWith(2, '/workorders?create=1')
  })

  it('shows the Create label at the top and collapses to the Plus icon after scrolling', async () => {
    render(<MemoryRouter><div className="page-content"><Dashboard onNavigate={vi.fn()} /></div></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    const createButton = screen.getByRole('button', { name: 'Create work order' })
    const scrollContainer = document.querySelector('.page-content')
    expect(createButton).not.toHaveClass('is-collapsed')
    expect(createButton).toHaveTextContent('Create')
    expect(createButton.querySelector('svg')).toHaveClass('lucide-plus')

    scrollContainer.scrollTop = 24
    fireEvent.scroll(scrollContainer)
    expect(createButton).toHaveClass('is-collapsed')

    scrollContainer.scrollTop = 0
    fireEvent.scroll(scrollContainer)
    expect(createButton).not.toHaveClass('is-collapsed')
  })
})
