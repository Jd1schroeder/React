import { CalendarDays, ChevronDown, ChevronUp, Filter, MoreHorizontal, Plus, Users } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'

const statusTone = { Open: 'blue', 'In Progress': 'orange', Completed: 'green', 'On Hold': 'purple' }

export function WorkOrderList({ activeTab, setActiveTab, visibleOrders, selected, onSelect, counts }) {
  return <section className="inbox-pane">
    <div className="work-order-tabs">
      <button className={activeTab === 'To Do' ? 'selected' : ''} onClick={() => setActiveTab('To Do')}>To Do <span>{counts.todo}</span></button>
      <button className={activeTab === 'Done' ? 'selected' : ''} onClick={() => setActiveTab('Done')}>Done <span>{counts.done}</span></button>
    </div>
    <div className="work-order-sort-row"><span>Sort By:</span><button>Priority: Highest First <ChevronDown size={12} /></button><button className="icon-button" aria-label="List options"><MoreHorizontal size={17} /></button></div>
    <div className="work-order-assignment-heading"><span>{activeTab === 'Done' ? 'Completed work orders' : `Assigned to Me (${visibleOrders.length})`}</span><ChevronUp size={15} /></div>
    <div className="work-order-list">
      {visibleOrders.map((order) => <button key={order.id} className={`work-order-item ${selected?.id === order.id ? 'selected' : ''}`} onClick={() => onSelect(order)}>
        <div className="order-item-top"><span className="order-title">{order.title}</span><span className={`priority priority-${order.priority.toLowerCase()}`}><i /></span></div>
        <div className="order-item-meta"><span>Requested by {order.requester}</span><span>{order.id}</span></div>
        <div className="order-item-bottom"><Badge tone={statusTone[order.status]}>{order.status}</Badge><span>{order.due}</span></div>
      </button>)}
      {visibleOrders.length === 0 && <div className="list-empty">No work orders match this view.</div>}
    </div>
  </section>
}

export function WorkOrderFilters() {
  return <div className="work-order-actions">
    <button className="filter-button"><Users size={14} /> Assigned to</button><button className="filter-button"><CalendarDays size={14} /> Due date</button><button className="filter-button"><Plus size={14} /> Add filter</button><button className="filter-button"><Filter size={14} /> My filters</button>
  </div>
}
