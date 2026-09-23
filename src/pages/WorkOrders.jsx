import { useMemo, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import './WorkOrders.css'
import { PanelLayout } from '../components/layout/PanelLayout'
import { WorkOrderDetail } from './work-orders/WorkOrderDetail'
import { WorkOrderFilters, WorkOrderList } from './work-orders/WorkOrderList'

const workOrders = []
const workOrderCounts = { todo: 0, done: 0 }

export function WorkOrders({ recordId, onNavigateRecord }) {
  const [activeTab, setActiveTab] = useState('To Do')
  const [localSelectedId, setLocalSelectedId] = useState(workOrders[0]?.id)
  const [search, setSearch] = useState('')
  const selectedId = recordId ?? localSelectedId
  const visibleOrders = useMemo(() => {
    const tabOrders = activeTab === 'Done' ? workOrders.filter((order) => order.status === 'Completed') : workOrders.filter((order) => order.status !== 'Completed')
    const normalizedSearch = search.trim().toLowerCase()
    return normalizedSearch ? tabOrders.filter((order) => `${order.title} ${order.id} ${order.location}`.toLowerCase().includes(normalizedSearch)) : tabOrders
  }, [activeTab, search])
  const selected = recordId ? workOrders.find((order) => order.id === selectedId) : visibleOrders[0] ?? workOrders[0]
  const missingRecord = Boolean(recordId && !selected)

  return <PanelLayout title="Work orders" modeIcon={PanelLeft} searchValue={search} onSearch={setSearch} searchPlaceholder="Search Work Orders" actionLabel="New work order" className="work-orders-page" bodyClassName="work-orders-layout" subnavigation={<WorkOrderFilters />}>
    <WorkOrderList activeTab={activeTab} setActiveTab={setActiveTab} visibleOrders={visibleOrders} selected={selected} counts={workOrderCounts} onSelect={(order) => { setLocalSelectedId(order.id); onNavigateRecord?.('workorders', order.id) }} />
    <WorkOrderDetail selected={selected} missingRecord={missingRecord} />
  </PanelLayout>
}
