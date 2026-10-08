import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from '../src/pages/Dashboard'

const dashboardMocks = vi.hoisted(() => ({
  getDashboardOverview: vi.fn(),
  getDashboardMetricWorkOrders: vi.fn(),
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
  getDashboardMetricWorkOrders: dashboardMocks.getDashboardMetricWorkOrders,
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  dashboardMocks.getDashboardMetricWorkOrders.mockResolvedValue([])
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

  it('opens an overdue Work Orders bottom sheet with the empty state and create action', async () => {
    const onNavigate = vi.fn()
    render(<MemoryRouter><div className="page-content" style={{ overflowY: 'auto' }}><Dashboard onNavigate={onNavigate} /></div></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    fireEvent.click(screen.getByRole('button', { name: /Overdue Work Orders/ }))

    const overdueSheet = await screen.findByRole('dialog', { name: 'Overdue Work Orders' })
    expect(overdueSheet).toHaveClass('is-empty')
    expect(document.querySelector('.page-content').style.overflowY).toBe('auto')
    expect(await screen.findByText('All good here!')).toBeInTheDocument()
    expect(screen.getByText('There are no Overdue Work Orders')).toBeInTheDocument()
    expect(dashboardMocks.getDashboardMetricWorkOrders).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Create Work Order' }))
    expect(onNavigate).toHaveBeenCalledWith('/workorders?create=1')
  })

  it('opens high-priority and completed lists with matching Work Orders', async () => {
    dashboardMocks.getDashboardMetricWorkOrders
      .mockResolvedValueOnce([{
        id: 'urgent-order',
        title: 'Line 5 pull-rolls stopped',
        work_order_number: 17652,
        status: 'In Progress',
        priority: 'Urgent',
      }])
      .mockResolvedValueOnce([{
        id: 'completed-order',
        title: 'Pump inspection',
        work_order_number: 17497,
        status: 'Completed',
        priority: 'High',
      }])
    renderDashboard()
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    fireEvent.click(screen.getByRole('button', { name: /High Priority Work Orders/ }))
    expect(await screen.findByRole('link', { name: /Line 5 pull-rolls stopped/ })).toHaveAttribute('href', '/workorders/urgent-order')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    fireEvent.click(screen.getByRole('button', { name: /Completed Work Orders/ }))
    const completedSheet = await screen.findByRole('dialog', { name: 'Completed Work Orders' })
    expect(within(completedSheet).getByRole('link', { name: /Pump inspection/ })).toHaveAttribute('href', '/workorders/completed-order')
    expect(dashboardMocks.getDashboardMetricWorkOrders).toHaveBeenNthCalledWith(2, expect.objectContaining({ metric: 'completed' }))
  })

  it('opens an explicit Requests placeholder instead of fabricating approval records', async () => {
    renderDashboard()
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    fireEvent.click(screen.getByRole('button', { name: /Requests Pending Approval/ }))

    expect(await screen.findByRole('dialog', { name: /Requests Pending Approval/ })).toBeInTheDocument()
    expect(screen.getByText('Requests are coming soon')).toBeInTheDocument()
    expect(screen.getByText('Request approvals will appear here when the Requests module is available.')).toBeInTheDocument()
    expect(dashboardMocks.getDashboardMetricWorkOrders).not.toHaveBeenCalled()
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
