import { supabase } from '../lib/supabase'
import { assertPermission, hasPermission } from './authorizationService'
import { listWorkOrderInboxCounts, listWorkOrderInboxPage } from './workOrderService'

async function countWorkOrders(organizationId, configureQuery) {
  const query = supabase.from('work_orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
  const { count, error } = await configureQuery(query)
  if (error) throw error
  return Number(count ?? 0)
}

async function listRecentWorkOrderActivity(organizationId, userId, grants) {
  assertPermission(grants, 'work_orders.view_comments')
  const { data: events, error } = await supabase.from('work_order_activity')
    .select('id, work_order_id, actor_id, event_type, details, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(8)
  if (error) throw error
  if (!events?.length) return []

  const workOrderIds = [...new Set(events.map((event) => event.work_order_id))]
  const { data: workOrders, error: workOrdersError } = await supabase.from('work_orders')
    .select('id, title, work_order_number')
    .eq('organization_id', organizationId)
    .in('id', workOrderIds)
  if (workOrdersError) throw workOrdersError
  const workOrdersById = new Map((workOrders ?? []).map((workOrder) => [workOrder.id, workOrder]))

  return events.flatMap((event) => {
    const workOrder = workOrdersById.get(event.work_order_id)
    if (!workOrder) return []
    return [{
      ...event,
      workOrder,
      actorLabel: event.actor_id && event.actor_id === userId ? 'You' : 'A teammate',
    }]
  })
}

export async function getDashboardOverview({ organizationId, userId, grants, today }) {
  if (!organizationId) throw new Error('Choose a workspace to view its overview.')
  if (!hasPermission(grants, 'work_orders.view')) {
    return { canViewWorkOrders: false, groups: [], recentActivity: [], activityAvailable: false }
  }
  assertPermission(grants, 'work_orders.view')

  const activityAvailable = hasPermission(grants, 'work_orders.view_comments')
  const [highPriorityCount, overdueCount, dueTodayCount, completedCount, groupCounts, recentActivity] = await Promise.all([
    countWorkOrders(organizationId, (query) => query.in('priority', ['Urgent', 'High']).neq('status', 'Completed')),
    countWorkOrders(organizationId, (query) => query.lt('due_date', today).neq('status', 'Completed')),
    countWorkOrders(organizationId, (query) => query.eq('due_date', today).neq('status', 'Completed')),
    countWorkOrders(organizationId, (query) => query.eq('status', 'Completed')),
    listWorkOrderInboxCounts({ organizationId, tab: 'To Do', search: '', grants }),
    activityAvailable ? listRecentWorkOrderActivity(organizationId, userId, grants) : Promise.resolve([]),
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
    recentActivity,
    activityAvailable,
  }
}
