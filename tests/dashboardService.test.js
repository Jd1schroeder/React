import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDashboardMetricWorkOrders } from '../src/services/dashboardService'

const serviceMocks = vi.hoisted(() => ({
  listWorkOrderInboxPage: vi.fn(),
}))

vi.mock('../src/services/workOrderService', () => ({
  listWorkOrderInboxCounts: vi.fn(),
  listWorkOrderInboxPage: serviceMocks.listWorkOrderInboxPage,
}))

beforeEach(() => {
  vi.clearAllMocks()
  serviceMocks.listWorkOrderInboxPage.mockResolvedValue([])
})

describe('getDashboardMetricWorkOrders', () => {
  it.each([
    {
      metric: 'high-priority',
      tab: 'To Do',
      group: 'all-open',
      sort: 'priority-highest',
      filters: [{ field: 'priority', operator: 'one_of', values: ['Urgent', 'High'] }],
    },
    {
      metric: 'overdue',
      tab: 'To Do',
      group: 'all-open',
      sort: 'due-earliest',
      filters: [{ field: 'due_date', operator: 'before', values: ['2026-10-08'] }],
    },
    {
      metric: 'completed',
      tab: 'Done',
      group: 'completed',
      sort: 'updated-newest',
      filters: [],
    },
  ])('loads a server-filtered first page for $metric', async ({ metric, ...query }) => {
    const workOrders = [{ id: `${metric}-work-order` }]
    serviceMocks.listWorkOrderInboxPage.mockResolvedValue(workOrders)

    await expect(getDashboardMetricWorkOrders({
      organizationId: 'organization-1',
      metric,
      today: '2026-10-08',
      grants: { 'work_orders.view': 'any' },
    })).resolves.toBe(workOrders)

    expect(serviceMocks.listWorkOrderInboxPage).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      ...query,
      search: '',
      offset: 0,
      pageSize: 50,
      includeRelations: false,
      grants: { 'work_orders.view': 'any' },
    })
  })
})
