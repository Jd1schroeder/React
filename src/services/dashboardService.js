import { supabase } from '../lib/supabase'
import { assertPermission, hasPermission } from './authorizationService'
import { listWorkOrderInboxCounts, listWorkOrderInboxPage } from './workOrderService'

const recentActivityPageSize = 8

async function countWorkOrders(organizationId, configureQuery) {
  const query = supabase.from('work_orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
  const { count, error } = await configureQuery(query)
  if (error) throw error
  return Number(count ?? 0)
}

export async function getDashboardRecentActivityPage({ organizationId, userId, grants, before = null }) {
  if (!organizationId) throw new Error('Choose a workspace to view recent activity.')
  assertPermission(grants, 'work_orders.view_comments')
  let activityQuery = supabase.from('work_order_activity')
    .select('id, work_order_id, actor_id, event_type, details, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  if (before?.created_at && before?.id) {
    activityQuery = activityQuery.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`)
  }
  const { data: fetchedEvents, error } = await activityQuery.limit(recentActivityPageSize + 1)
  if (error) throw error
  const events = fetchedEvents ?? []
  const pageEvents = events.slice(0, recentActivityPageSize)
  if (!pageEvents.length) return { items: [], hasMore: false, nextCursor: null }

  const workOrderIds = [...new Set(pageEvents.map((event) => event.work_order_id))]
  const { data: workOrders, error: workOrdersError } = await supabase.from('work_orders')
    .select('id, title, work_order_number')
    .eq('organization_id', organizationId)
    .in('id', workOrderIds)
  if (workOrdersError) throw workOrdersError
  const workOrdersById = new Map((workOrders ?? []).map((workOrder) => [workOrder.id, workOrder]))

  const items = pageEvents.flatMap((event) => {
    const workOrder = workOrdersById.get(event.work_order_id)
    if (!workOrder) return []
    return [{
      ...event,
      workOrder,
      actorLabel: event.actor_id && event.actor_id === userId ? 'You' : 'A teammate',
    }]
  })
  const lastEvent = pageEvents.at(-1)
  return {
    items,
    hasMore: events.length > recentActivityPageSize,
    nextCursor: lastEvent ? { created_at: lastEvent.created_at, id: lastEvent.id } : null,
  }
}

export async function getDashboardOverview({ organizationId, userId, grants, today }) {
  if (!organizationId) throw new Error('Choose a workspace to view its overview.')
  if (!hasPermission(grants, 'work_orders.view')) {
    return { canViewWorkOrders: false, groups: [], recentActivity: [], recentActivityHasMore: false, recentActivityCursor: null, activityAvailable: false }
  }
  assertPermission(grants, 'work_orders.view')

  const activityAvailable = hasPermission(grants, 'work_orders.view_comments')
  const [highPriorityCount, overdueCount, dueTodayCount, completedCount, groupCounts, recentActivityPage] = await Promise.all([
    countWorkOrders(organizationId, (query) => query.in('priority', ['Urgent', 'High']).neq('status', 'Completed')),
    countWorkOrders(organizationId, (query) => query.lt('due_date', today).neq('status', 'Completed')),
    countWorkOrders(organizationId, (query) => query.eq('due_date', today).neq('status', 'Completed')),
    countWorkOrders(organizationId, (query) => query.eq('status', 'Completed')),
    listWorkOrderInboxCounts({ organizationId, tab: 'To Do', search: '', grants }),
    activityAvailable
      ? getDashboardRecentActivityPage({ organizationId, userId, grants })
      : Promise.resolve({ items: [], hasMore: false, nextCursor: null }),
  ])

  const groupDefinitions = [
    { id: 'assigned-to-my-teams', label: 'Assigned to My Teams' },
    { id: 'assigned-to-me', label: 'Assigned to Me' },
  ]
  const groups = await Promise.all(groupDefinitions.map(async (group) => {
    const count = Number(groupCounts[group.id] ?? 0)
    const workOrders = count > 0
      ? await listWorkOrderInboxPage({
          organizationId,
          tab: 'To Do',
          group: group.id,
          search: '',
          sort: 'priority-highest',
          offset: 0,
          pageSize: 3,
          grants,
        })
      : []
    return { ...group, count, workOrders }
  }))

  return {
    canViewWorkOrders: true,
    metrics: { highPriorityCount, overdueCount, dueTodayCount, completedCount },
    groups,
    recentActivity: recentActivityPage.items,
    recentActivityHasMore: recentActivityPage.hasMore,
    recentActivityCursor: recentActivityPage.nextCursor,
    activityAvailable,
  }
}

export async function getDashboardMetricWorkOrders({ organizationId, metric, today, grants }) {
  const metricQueries = {
    'high-priority': {
      tab: 'To Do',
      group: 'all-open',
      sort: 'priority-highest',
      filters: [{ field: 'priority', operator: 'one_of', values: ['Urgent', 'High'] }],
    },
    overdue: {
      tab: 'To Do',
      group: 'all-open',
      sort: 'due-earliest',
      filters: [{ field: 'due_date', operator: 'before', values: [today] }],
    },
    completed: {
      tab: 'Done',
      group: 'completed',
      sort: 'updated-newest',
      filters: [],
    },
  }
  const query = metricQueries[metric]
  if (!query) throw new Error('This Dashboard list is not available yet.')

  return listWorkOrderInboxPage({
    organizationId,
    tab: query.tab,
    group: query.group,
    search: '',
    sort: query.sort,
    offset: 0,
    pageSize: 50,
    filters: query.filters,
    includeRelations: false,
    grants,
  })
}
