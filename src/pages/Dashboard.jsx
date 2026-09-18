import { workOrders } from '../data/mockData'
import { AlertTriangle, CheckCircle2, ClipboardList, Timer } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import './Dashboard.css'

const toneForStatus = { Open: 'blue', 'In Progress': 'orange', Completed: 'green', 'On Hold': 'purple' }

export function Dashboard({ onNavigate }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">Tuesday, September 16, 2026</p><h1>Good morning, Jordan</h1><p className="muted">Here’s what’s happening across your facilities today.</p></div><Button onClick={() => onNavigate('Work Orders')}>+ Create work order</Button></div>
    <section className="stats-grid"><StatCard label="Open work orders" value="24" detail="5 due today" tone="blue" icon={ClipboardList} /><StatCard label="Overdue" value="6" detail="2 high priority" tone="red" icon={AlertTriangle} /><StatCard label="Completed this month" value="87" detail="↑ 12% from last month" tone="green" icon={CheckCircle2} /><StatCard label="Avg. completion time" value="2.4d" detail="↓ 0.6d from last month" tone="purple" icon={Timer} /></section>
    <div className="content-grid"><section className="panel"><div className="panel-heading"><div><h2>Recent work orders</h2><p className="muted">Stay on top of your team’s latest activity.</p></div><button className="text-button" onClick={() => onNavigate('Work Orders')}>View all →</button></div><div className="table-wrap"><table><thead><tr><th>Work order</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th></tr></thead><tbody>{workOrders.slice(0, 4).map((order) => <tr key={order.id}><td><strong>{order.title}</strong><small>{order.id} · {order.location}</small></td><td><Badge tone={toneForStatus[order.status]}>{order.status}</Badge></td><td><span className={`priority priority-${order.priority.toLowerCase()}`}><i />{order.priority}</span></td><td><span className="avatar">{order.assignee}</span></td><td className="muted">{order.due}</td></tr>)}</tbody></table></div></section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Team activity</h2><p className="muted">Latest updates from your team.</p></div></div><div className="activity"><div className="avatar avatar-green">MK</div><p><strong>Maria Kim</strong> completed <b>WO-1045</b><small>12 minutes ago</small></p></div><div className="activity"><div className="avatar avatar-blue">JD</div><p><strong>Jordan Davis</strong> commented on <b>WO-1048</b><small>34 minutes ago</small></p></div><div className="activity"><div className="avatar avatar-orange">AR</div><p><strong>Alex Rivera</strong> created a new work order<small>1 hour ago</small></p></div><button className="text-button">View activity →</button></section></div>
  </>
}
