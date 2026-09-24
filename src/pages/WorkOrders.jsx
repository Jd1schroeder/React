import { useEffect, useMemo, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import './WorkOrders.css'
import { PanelLayout } from '../components/layout/PanelLayout'
import { WorkOrderDetail } from './work-orders/WorkOrderDetail'
import { WorkOrderFilters, WorkOrderList } from './work-orders/WorkOrderList'
import { getCurrentWorkspace } from '../services/workspaceService'
import { listWorkOrders, updateWorkOrderExecution } from '../services/workOrderService'

function normalizeWorkOrder(order) {
  return { ...order, due: order.due_at ? new Date(order.due_at).toLocaleDateString() : 'No due date', requester: order.requester_id ? 'Requester' : 'Not available', location: 'Not available', workType: 'Work Order', asset: 'Not available', assignee: order.assigned_to ? 'Assigned user' : 'Unassigned', assignedTeam: order.assigned_to ? 'Assigned user' : 'Unassigned' }
}

export function WorkOrders({ recordId, onNavigateRecord }) {
  const [activeTab, setActiveTab] = useState('To Do')
  const [workOrders, setWorkOrders] = useState([])
  const [localSelectedId, setLocalSelectedId] = useState()
  const [search, setSearch] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const selectedId = recordId ?? localSelectedId
  useEffect(() => {
    getCurrentWorkspace().then(async (workspace) => {
      const id = workspace.organization?.id ?? ''
      setOrganizationId(id)
      if (id) setWorkOrders((await listWorkOrders(id)).map(normalizeWorkOrder))
    }).catch((loadError) => setError(loadError.message || 'Unable to load Work Orders.')).finally(() => setIsLoading(false))
  }, [])
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
      const updated = normalizeWorkOrder(await updateWorkOrderExecution({ organizationId, workOrderId: selected.id, status: 'Completed' }))
      setWorkOrders((current) => current.map((order) => order.id === updated.id ? updated : order))
    } catch (updateError) { setError(updateError.message || 'Unable to update this Work Order.') }
  }

  return <PanelLayout title="Work orders" modeIcon={PanelLeft} searchValue={search} onSearch={setSearch} searchPlaceholder="Search Work Orders" actionLabel="New work order" className="work-orders-page" bodyClassName="work-orders-layout" subnavigation={<WorkOrderFilters />}>
    {isLoading && <div className="work-orders-loading">Loading Work Orders...</div>}
    {!isLoading && error && <div className="work-orders-loading" role="alert">{error}</div>}
    {!isLoading && !error && <><WorkOrderList activeTab={activeTab} setActiveTab={setActiveTab} visibleOrders={visibleOrders} selected={selected} counts={workOrderCounts} onSelect={(order) => { setLocalSelectedId(order.id); onNavigateRecord?.('workorders', order.id) }} /><WorkOrderDetail selected={selected} missingRecord={missingRecord} onMarkDone={markDone} /></>}
  </PanelLayout>
}
