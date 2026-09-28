import { useEffect, useMemo, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import './WorkOrders.css'
import { PanelLayout } from '../components/layout/PanelLayout'
import { WorkOrderDetail } from './work-orders/WorkOrderDetail'
import { WorkOrderFilters, WorkOrderList } from './work-orders/WorkOrderList'
import { hasPermission } from '../services/authorizationService'
import { useWorkspace } from '../components/layout/useWorkspace'
import { listWorkOrders, updateWorkOrderExecution } from '../services/workOrderService'

function normalizeWorkOrder(order) {
  return { ...order, due: order.due_at ? new Date(order.due_at).toLocaleDateString() : 'No due date', requester: order.requester_id ? 'Requester' : 'Not available', location: 'Not available', workType: 'Work Order', asset: 'Not available', assignee: order.assigned_to ? 'Assigned user' : 'Unassigned', assignedTeam: order.team_id ? 'Assigned team' : 'Unassigned' }
}

export function WorkOrders({ recordId, onNavigateRecord }) {
  const workspace = useWorkspace()
  const organizationId = workspace.organization?.id ?? ''
  const grants = useMemo(() => workspace.authorization?.grants ?? {}, [workspace.authorization?.grants])
  const teamIds = workspace.teamIds ?? []
  const canViewWorkOrders = workspace.authorization?.status === 'ready' && hasPermission(grants, 'work_orders.view')
  const canCreateWorkOrders = canViewWorkOrders && hasPermission(grants, 'work_orders.create')
  const userId = workspace.user?.id
  const [activeTab, setActiveTab] = useState('To Do')
  const [workOrders, setWorkOrders] = useState([])
  const [localSelectedId, setLocalSelectedId] = useState()
  const [search, setSearch] = useState('')
  const [loadState, setLoadState] = useState('loading')
  const [error, setError] = useState('')
  const isLoading = canViewWorkOrders && loadState === 'loading'
  const selectedId = recordId ?? localSelectedId
  useEffect(() => {
    if (!canViewWorkOrders || !organizationId) {
      return undefined
    }
    let active = true
    listWorkOrders(organizationId, grants)
      .then((orders) => { if (active) setWorkOrders(orders.map(normalizeWorkOrder)) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load Work Orders.') })
      .finally(() => { if (active) setLoadState('ready') })
    return () => { active = false }
  }, [canViewWorkOrders, grants, organizationId])
  const visibleOrders = useMemo(() => {
    const tabOrders = activeTab === 'Done' ? workOrders.filter((order) => order.status === 'Completed') : workOrders.filter((order) => order.status !== 'Completed')
    const normalizedSearch = search.trim().toLowerCase()
    return normalizedSearch ? tabOrders.filter((order) => `${order.title} ${order.id} ${order.location}`.toLowerCase().includes(normalizedSearch)) : tabOrders
  }, [activeTab, search, workOrders])
  const selected = recordId ? workOrders.find((order) => order.id === selectedId) : visibleOrders[0] ?? workOrders[0]
  const missingRecord = Boolean(recordId && !selected)
  const workOrderCounts = { todo: workOrders.filter((order) => order.status !== 'Completed').length, done: workOrders.filter((order) => order.status === 'Completed').length }
  const markDone = async () => {
    if (!organizationId || !selected) return
    try {
      const updated = normalizeWorkOrder(await updateWorkOrderExecution({ organizationId, workOrderId: selected.id, status: 'Completed', grants, record: { userId, ownerId: selected.created_by, assigneeId: selected.assigned_to, teamId: selected.team_id, teamIds } }))
      setWorkOrders((current) => current.map((order) => order.id === updated.id ? updated : order))
    } catch (updateError) { setError(updateError.message || 'Unable to update this Work Order.') }
  }

  return <PanelLayout title="Work orders" modeIcon={PanelLeft} searchValue={search} onSearch={setSearch} searchPlaceholder="Search Work Orders" actionLabel="New work order" showHeaderSearch={canViewWorkOrders} showAction={canCreateWorkOrders} className="work-orders-page" bodyClassName="work-orders-layout" subnavigation={canViewWorkOrders ? <WorkOrderFilters /> : null}>
    {isLoading && <div className="work-orders-loading">Loading Work Orders...</div>}
    {!isLoading && error && <div className="work-orders-loading" role="alert">{error}</div>}
    {!isLoading && !error && !canViewWorkOrders && <div className="work-orders-loading" role="status">You do not have permission to view Work Orders.</div>}
    {!isLoading && !error && canViewWorkOrders && <><WorkOrderList activeTab={activeTab} setActiveTab={setActiveTab} visibleOrders={visibleOrders} selected={selected} counts={workOrderCounts} onSelect={(order) => { setLocalSelectedId(order.id); onNavigateRecord?.('workorders', order.id) }} /><WorkOrderDetail selected={selected} missingRecord={missingRecord} onMarkDone={markDone} grants={grants} userId={userId} teamIds={teamIds} /></>}
  </PanelLayout>
}
