import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from '../src/pages/Dashboard'

const dashboardMocks = vi.hoisted(() => ({
  getDashboardOverview: vi.fn(),
  getDashboardMetricWorkOrders: vi.fn(),
  getDashboardRecentActivityPage: vi.fn(),
  getDashboardWorkOrderGroupPage: vi.fn(),
  workspace: {
    organization: { id: 'organization-1', name: 'Simona PMC' },
    profile: { first_name: 'Joshua', last_name: 'Schroeder', avatar_url: 'https://example.com/josh-avatar.png' },
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
  getDashboardRecentActivityPage: dashboardMocks.getDashboardRecentActivityPage,
  getDashboardWorkOrderGroupPage: dashboardMocks.getDashboardWorkOrderGroupPage,
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
beforeEach(() => {
  vi.clearAllMocks()
  dashboardMocks.getDashboardMetricWorkOrders.mockResolvedValue([])
  dashboardMocks.getDashboardWorkOrderGroupPage.mockResolvedValue([])
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
    recentActivityHasMore: false,
    recentActivityCursor: null,
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

  it('shows the signed-in user avatar for their Recent Activity entries', async () => {
    dashboardMocks.getDashboardOverview.mockResolvedValueOnce({
      canViewWorkOrders: true,
      metrics: { highPriorityCount: 0, overdueCount: 0, dueTodayCount: 0, completedCount: 0 },
      groups: [],
      recentActivity: [{
        id: 'activity-1',
        actor_id: 'user-1',
        actorLabel: 'You',
        event_type: 'status_changed',
        details: { to: 'Open' },
        created_at: '2026-10-08T17:07:00.000Z',
        workOrder: { id: 'work-order-1', work_order_number: 2, title: 'Image test' },
      }],
      activityAvailable: true,
    })
    renderDashboard()

    const activityLink = await screen.findByRole('link', { name: '#2 Image test' })
    const activityRow = activityLink.closest('.dashboard-activity-row')
    expect(activityRow.querySelector('strong')).toHaveTextContent('Joshua Schroeder')
    expect(activityRow).not.toHaveTextContent('You')
    expect(activityRow.querySelector('img')).toHaveAttribute('src', 'https://example.com/josh-avatar.png')
  })

  it('loads and appends the next Recent Activity page on demand', async () => {
    const firstEvent = {
      id: 'activity-1',
      actor_id: 'user-1',
      event_type: 'status_changed',
      details: { to: 'Open' },
      created_at: '2026-10-08T17:07:00.000Z',
      workOrder: { id: 'work-order-1', work_order_number: 2, title: 'Image test' },
    }
    const nextEvent = {
      id: 'activity-2',
      actor_id: 'user-1',
      event_type: 'work_order_created',
      details: {},
      created_at: '2026-10-08T16:07:00.000Z',
      workOrder: { id: 'work-order-2', work_order_number: 3, title: 'More activity' },
    }
    dashboardMocks.getDashboardOverview.mockResolvedValueOnce({
      canViewWorkOrders: true,
      metrics: { highPriorityCount: 0, overdueCount: 0, dueTodayCount: 0, completedCount: 0 },
      groups: [],
      recentActivity: [firstEvent],
      recentActivityHasMore: true,
      recentActivityCursor: { created_at: firstEvent.created_at, id: firstEvent.id },
      activityAvailable: true,
    })
    dashboardMocks.getDashboardRecentActivityPage.mockResolvedValueOnce({ items: [nextEvent], hasMore: false, nextCursor: null })
    renderDashboard()

    expect(await screen.findByRole('link', { name: '#2 Image test' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Load more activity' }))

    expect(await screen.findByRole('link', { name: '#3 More activity' })).toBeInTheDocument()
    expect(dashboardMocks.getDashboardRecentActivityPage).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      userId: 'user-1',
      grants: dashboardMocks.workspace.authorization.grants,
      before: { created_at: firstEvent.created_at, id: firstEvent.id },
    })
    expect(screen.getByText('You’re all caught up.')).toBeInTheDocument()
  })

  it('automatically requests another activity page when the feed approaches the viewport', async () => {
    let observerCallback
    let observerOptions
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback, options) {
        observerCallback = callback
        observerOptions = options
      }
      observe() {}
      disconnect() {}
    })
    const firstEvent = {
      id: 'activity-1',
      actor_id: 'user-1',
      event_type: 'work_order_created',
      details: {},
      created_at: '2026-10-08T17:07:00.000Z',
      workOrder: { id: 'work-order-1', work_order_number: 2, title: 'Image test' },
    }
    dashboardMocks.getDashboardOverview.mockResolvedValueOnce({
      canViewWorkOrders: true,
      metrics: { highPriorityCount: 0, overdueCount: 0, dueTodayCount: 0, completedCount: 0 },
      groups: [],
      recentActivity: [firstEvent],
      recentActivityHasMore: true,
      recentActivityCursor: { created_at: firstEvent.created_at, id: firstEvent.id },
      activityAvailable: true,
    })
    dashboardMocks.getDashboardRecentActivityPage.mockResolvedValueOnce({
      items: [{ ...firstEvent, id: 'activity-2', workOrder: { id: 'work-order-2', work_order_number: 3, title: 'Loaded on scroll' } }],
      hasMore: false,
      nextCursor: null,
    })
    render(<MemoryRouter><div className="page-content"><Dashboard onNavigate={vi.fn()} /></div></MemoryRouter>)

    expect(await screen.findByRole('link', { name: '#2 Image test' })).toBeInTheDocument()
    expect(observerOptions).toMatchObject({ rootMargin: '0px 0px 320px 0px' })
    observerCallback([{ isIntersecting: true }])

    expect(await screen.findByRole('link', { name: '#3 Loaded on scroll' })).toBeInTheDocument()
    expect(dashboardMocks.getDashboardRecentActivityPage).toHaveBeenCalledTimes(1)
  })

  it('uses the QR scan icon and keeps the not-yet-supported action disabled', async () => {
    renderDashboard()
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    const scanAction = screen.getByRole('button', { name: /Scan Code/ })
    expect(scanAction).toBeDisabled()
    expect(scanAction.querySelector('svg')).toHaveClass('lucide-scan-qr-code')
  })

  it('routes due-today and opens the create picker from the dashboard action', async () => {
    const onNavigate = renderDashboard()
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    fireEvent.click(screen.getByRole('button', { name: /Due Today/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onNavigate).toHaveBeenNthCalledWith(1, '/workorders?dashboardFilter=due-today')
    expect(await screen.findByRole('dialog', { name: 'What would you like to Create?' })).toBeInTheDocument()
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('offers Work Order creation and locks the not-yet-implemented types', async () => {
    const onNavigate = renderDashboard()
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    const picker = await screen.findByRole('dialog', { name: 'What would you like to Create?' })
    expect(picker).toHaveClass('mobile-edge-to-edge-sheet')
    const workOrderOption = within(picker).getByRole('button', { name: 'Work Order' })
    expect(workOrderOption).toBeEnabled()
    const purchaseOrderOption = within(picker).getByRole('button', { name: /Purchase Order/ })
    expect(purchaseOrderOption).toBeDisabled()
    expect(purchaseOrderOption.querySelector('.dashboard-create-option-lock')).toBeInTheDocument()
    expect(within(picker).queryByText('New')).not.toBeInTheDocument()
    for (const label of ['Asset', 'Part', 'Procedure', 'Location']) {
      expect(within(picker).getByRole('button', { name: new RegExp(label) })).toBeDisabled()
    }

    fireEvent.click(workOrderOption)
    expect(onNavigate).toHaveBeenCalledWith('/workorders?create=1')
    expect(screen.queryByRole('dialog', { name: 'What would you like to Create?' })).not.toBeInTheDocument()
  })

  it('closes the create picker with Escape and returns focus to its trigger', async () => {
    renderDashboard()
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })
    const createButton = screen.getByRole('button', { name: 'Create' })
    fireEvent.click(createButton)

    expect(await screen.findByRole('dialog', { name: 'What would you like to Create?' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'What would you like to Create?' })).not.toBeInTheDocument()
    expect(createButton).toHaveFocus()
  })

  it('dismisses dashboard metric and create sheets with a downward header pull on mobile', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    renderDashboard()
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    fireEvent.click(screen.getByRole('button', { name: /Overdue Work Orders/ }))
    const metricSheet = await screen.findByRole('dialog', { name: 'Overdue Work Orders' })
    const metricHeader = metricSheet.querySelector('.dashboard-metric-sheet-header')
    fireEvent.touchStart(metricHeader, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(metricHeader, { touches: [{ clientY: 260 }] })
    fireEvent.touchEnd(metricHeader, { changedTouches: [{ clientY: 260 }] })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Overdue Work Orders' })).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    const createSheet = await screen.findByRole('dialog', { name: 'What would you like to Create?' })
    const createHeader = createSheet.querySelector('.dashboard-create-header')
    fireEvent.touchStart(createHeader, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(createHeader, { touches: [{ clientY: 260 }] })
    fireEvent.touchEnd(createHeader, { changedTouches: [{ clientY: 260 }] })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'What would you like to Create?' })).not.toBeInTheDocument())
  })

  it('opens an overdue Work Orders bottom sheet with the empty state and create action', async () => {
    const onNavigate = vi.fn()
    render(<MemoryRouter><div className="page-content" style={{ overflowY: 'auto' }}><Dashboard onNavigate={onNavigate} /></div></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Welcome to Simona PMC' })

    fireEvent.click(screen.getByRole('button', { name: /Overdue Work Orders/ }))

    const overdueSheet = await screen.findByRole('dialog', { name: 'Overdue Work Orders' })
    expect(overdueSheet).toHaveClass('is-empty', 'mobile-edge-to-edge-sheet')
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

  it.each([
    { id: 'assigned-to-me', label: 'Assigned to Me', title: 'Assigned To Me' },
    { id: 'assigned-to-my-teams', label: 'Assigned to My Teams', title: 'Assigned To My Teams' },
  ])('opens the mobile View all sheet for $title', async ({ id, label, title }) => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const group = {
      id,
      label,
      count: 1,
      workOrders: [{ id: 'preview-order', title: 'Preview order', work_order_number: 10, status: 'Open', priority: 'High' }],
    }
    dashboardMocks.getDashboardOverview.mockResolvedValueOnce({
      canViewWorkOrders: true,
      metrics: { highPriorityCount: 0, overdueCount: 0, dueTodayCount: 0, completedCount: 0 },
      groups: [group],
      recentActivity: [],
      recentActivityHasMore: false,
      recentActivityCursor: null,
      activityAvailable: true,
    })
    dashboardMocks.getDashboardWorkOrderGroupPage.mockResolvedValueOnce({ items: [{
      id: 'work-order-10',
      title: 'Line 5 first set of pull-rolls stopped running',
      work_order_number: 17652,
      status: 'In Progress',
      priority: 'High',
    }], hasMore: false, nextOffset: 1 })
    renderDashboard()

    const viewAll = within(await screen.findByRole('region', { name: label })).getByRole('link', { name: 'View all' })
    fireEvent.click(viewAll)

    const sheet = await screen.findByRole('dialog', { name: title })
    expect(sheet).toHaveClass('mobile-edge-to-edge-sheet')
    const workOrderLink = await within(sheet).findByRole('link', { name: /Line 5 first set.*17652/ })
    expect(workOrderLink).toHaveAttribute('href', '/workorders/work-order-10')
    expect(within(sheet).getByText('In Progress')).toBeInTheDocument()
    expect(dashboardMocks.getDashboardWorkOrderGroupPage).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      groupId: id,
      offset: 0,
      totalCount: 1,
      grants: dashboardMocks.workspace.authorization.grants,
    })

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: title })).not.toBeInTheDocument())
    expect(viewAll).toHaveFocus()
  })

  it('dismisses the assigned-work sheet on a downward header pull, not a list swipe', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    dashboardMocks.getDashboardWorkOrderGroupPage.mockResolvedValueOnce({ items: [{
      id: 'work-order-1',
      title: 'Pump inspection',
      work_order_number: 17497,
      status: 'Open',
      priority: 'High',
    }], hasMore: false, nextOffset: 1 })
    renderDashboard()

    fireEvent.click(within(await screen.findByRole('region', { name: 'Assigned to Me' })).getByRole('link', { name: 'View all' }))
    const sheet = await screen.findByRole('dialog', { name: 'Assigned To Me' })
    const workOrderLink = await within(sheet).findByRole('link', { name: /Pump inspection.*17497/ })
    fireEvent.touchStart(workOrderLink, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(workOrderLink, { touches: [{ clientY: 300 }] })
    fireEvent.touchEnd(workOrderLink, { changedTouches: [{ clientY: 300 }] })
    expect(screen.getByRole('dialog', { name: 'Assigned To Me' })).toBeInTheDocument()

    const sheetHeader = sheet.querySelector('.dashboard-group-sheet-header')
    fireEvent.touchStart(sheetHeader, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(sheetHeader, { touches: [{ clientY: 300 }] })
    fireEvent.touchEnd(sheetHeader, { changedTouches: [{ clientY: 300 }] })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Assigned To Me' })).not.toBeInTheDocument())
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

    const createButton = screen.getByRole('button', { name: 'Create' })
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
