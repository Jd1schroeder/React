import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDashboardMetricWorkOrders, getDashboardRecentActivityPage, getDashboardWorkOrderGroupPage } from '../src/services/dashboardService'

const serviceMocks = vi.hoisted(() => ({
  listWorkOrderInboxPage: vi.fn(),
  supabaseFrom: vi.fn(),
}))

vi.mock('../src/services/workOrderService', () => ({
  listWorkOrderInboxCounts: vi.fn(),
  listWorkOrderInboxPage: serviceMocks.listWorkOrderInboxPage,
}))

vi.mock('../src/lib/supabase', () => ({
  supabase: { from: serviceMocks.supabaseFrom },
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

describe('getDashboardWorkOrderGroupPage', () => {
  it.each(['assigned-to-me', 'assigned-to-my-teams'])('requests a server-filtered page for %s', async (groupId) => {
    const workOrders = Array.from({ length: 50 }, (_, index) => ({ id: `work-order-${index + 1}` }))
    serviceMocks.listWorkOrderInboxPage.mockResolvedValue(workOrders)

    await expect(getDashboardWorkOrderGroupPage({
      organizationId: 'organization-1',
      groupId,
      offset: 50,
      totalCount: 150,
      grants: { 'work_orders.view': 'any' },
    })).resolves.toEqual({ items: workOrders, hasMore: true, nextOffset: 100 })

    expect(serviceMocks.listWorkOrderInboxPage).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      tab: 'To Do',
      group: groupId,
      search: '',
      sort: 'priority-highest',
      offset: 50,
      pageSize: 50,
      includeRelations: false,
      grants: { 'work_orders.view': 'any' },
    })
  })

  it('rejects unknown dashboard groups', async () => {
    await expect(getDashboardWorkOrderGroupPage({
      organizationId: 'organization-1',
      groupId: 'all-open',
      grants: { 'work_orders.view': 'any' },
    })).rejects.toThrow('This Dashboard list is not available.')
    expect(serviceMocks.listWorkOrderInboxPage).not.toHaveBeenCalled()
  })
})

function makeQueryBuilder(data, calls) {
  const builder = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'or', 'in']) {
    builder[method] = (...args) => {
      calls.push([method, ...args])
      return builder
    }
  }
  builder.then = (resolve, reject) => Promise.resolve({ data, error: null }).then(resolve, reject)
  return builder
}

describe('getDashboardRecentActivityPage', () => {
  it('fetches an initial page of eight events and uses the ninth to signal continuation', async () => {
    const activityCalls = []
    const orderCalls = []
    const events = Array.from({ length: 9 }, (_, index) => ({
      id: `activity-${index + 1}`,
      work_order_id: `work-order-${index + 1}`,
      actor_id: 'user-1',
      event_type: 'work_order_created',
      details: {},
      created_at: new Date(Date.UTC(2026, 9, 8, 17, 0 - index)).toISOString(),
    }))
    serviceMocks.supabaseFrom.mockImplementation((table) => table === 'work_order_activity'
      ? makeQueryBuilder(events, activityCalls)
      : makeQueryBuilder(events.slice(0, 8).map((event) => ({ id: event.work_order_id, title: `Order ${event.id}`, work_order_number: event.id })), orderCalls))

    const page = await getDashboardRecentActivityPage({
      organizationId: 'organization-1',
      userId: 'user-1',
      grants: { 'work_orders.view_comments': 'any' },
    })

    expect(page.items).toHaveLength(8)
    expect(page.hasMore).toBe(true)
    expect(page.nextCursor).toEqual({ created_at: events[7].created_at, id: events[7].id })
    expect(activityCalls).toContainEqual(['limit', 9])
    expect(orderCalls).toContainEqual(['in', 'id', events.slice(0, 8).map((event) => event.work_order_id)])
  })

  it('continues from a stable timestamp-and-id cursor', async () => {
    const activityCalls = []
    serviceMocks.supabaseFrom.mockImplementation((table) => makeQueryBuilder([], table === 'work_order_activity' ? activityCalls : []))
    const before = { created_at: '2026-10-08T16:00:00.000Z', id: 'activity-8' }

    await expect(getDashboardRecentActivityPage({
      organizationId: 'organization-1',
      userId: 'user-1',
      grants: { 'work_orders.view_comments': 'any' },
      before,
    })).resolves.toEqual({ items: [], hasMore: false, nextCursor: null })

    expect(activityCalls).toContainEqual(['or', `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`])
  })
})
