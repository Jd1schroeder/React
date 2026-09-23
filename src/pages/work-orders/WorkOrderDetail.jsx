import { CalendarDays, Check, CircleDot, ClipboardList, Clock3, Copy, MapPin, MessageCircle, Paperclip, Users, ChevronDown } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PanelOverflowButton, PanelRecordNotFound } from '../../components/layout/PanelView'

const statusTone = { Open: 'blue', 'In Progress': 'orange', Completed: 'green', 'On Hold': 'purple' }

function DetailRow({ icon: Icon, label, children }) {
  return <div className="detail-row"><Icon size={16} strokeWidth={1.8} /><span className="detail-label">{label}</span><span className="detail-value">{children}</span></div>
}

export function WorkOrderDetail({ selected, missingRecord }) {
  if (missingRecord) return <section className="detail-pane"><PanelRecordNotFound /></section>
  if (!selected) return <section className="detail-pane" />
  return <section className="detail-pane">
    <header className="detail-header"><div className="detail-heading"><div className="detail-title-row"><h2>{selected.title}</h2><button className="icon-button" aria-label="Copy work order link"><Copy size={15} /></button></div><div className="detail-meta"><CalendarDays size={14} /> Due by {selected.due} <span>Â·</span> {selected.id}</div></div><div className="detail-actions"><button className="button button-secondary"><MessageCircle size={15} /> Comments (7)</button><Button><Check size={15} /> Mark as done</Button><PanelOverflowButton label="More work order actions" /></div></header>
    <div className="detail-scroll">
      <div className="detail-status-row"><Badge tone={statusTone[selected.status]}>{selected.status}</Badge><button className="status-select"><CircleDot size={13} /> {selected.priority} priority <ChevronDown size={13} /></button></div>
      <div className="detail-card"><h3>Details</h3><DetailRow icon={ClipboardList} label="Work type">{selected.workType}</DetailRow><DetailRow icon={MapPin} label="Location">{selected.location}</DetailRow><DetailRow icon={CircleDot} label="Asset">{selected.asset}</DetailRow><DetailRow icon={Users} label="Assigned to"><span className="detail-person"><Avatar className="avatar-blue" name={selected.assignee} alt={selected.assignee} /> {selected.assignedTeam}</span></DetailRow><DetailRow icon={Clock3} label="Created">{selected.created}</DetailRow></div>
      <div className="detail-card"><div className="section-heading"><h3>Description</h3><button className="text-button">Edit</button></div><p className="detail-copy">{selected.description}</p><div className="attachment-row"><Paperclip size={15} /> {selected.attachments ? `${selected.attachments} attachments` : 'No attachments yet'}</div></div>
      <div className="detail-card activity-card"><div className="section-heading"><h3>Activity</h3><button className="text-button">View all</button></div><div className="activity"><Avatar className="avatar-blue" name="Jordan Davis" alt="Jordan Davis" /><p><strong>Jordan Davis</strong> commented on this work order<small>34 minutes ago</small></p></div><div className="activity"><Avatar className="avatar-green" name="Maria Kim" alt="Maria Kim" /><p><strong>Maria Kim</strong> updated the status to <b>{selected.status}</b><small>1 hour ago</small></p></div><label className="comment-box"><input placeholder="Add a comment..." /><button aria-label="Send comment"><MessageCircle size={16} /></button></label></div>
    </div>
  </section>
}
