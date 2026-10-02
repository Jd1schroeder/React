import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleDot,
  ClipboardList,
  Clock3,
  Copy,
  EllipsisVertical,
  MailOpen,
  MapPin,
  MessageCircle,
  Paperclip,
  Users,
  ChevronDown,
} from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { PanelRecordNotFound } from "../../components/layout/PanelView";
import { canAccessRecord } from "../../services/authorizationService";
import "./WorkOrderDetail.css";

const statusTone = {
  Open: "blue",
  "In Progress": "orange",
  Completed: "green",
  "On Hold": "purple",
  Cancelled: "gray",
  Skipped: "gray",
};

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="detail-row">
      <Icon size={16} strokeWidth={1.8} />
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children}</span>
    </div>
  );
}

export function WorkOrderDetail({
  selected,
  missingRecord,
  onMarkDone,
  onToggleRead,
  isSavingReadState = false,
  grants,
  userId,
  teamIds = [],
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const dismiss = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);
  if (missingRecord)
    return (
      <section className="detail-pane">
        <PanelRecordNotFound />
      </section>
    );
  if (!selected) return <section className="detail-pane" />;
  const record = {
    userId,
    ownerId: selected.created_by,
    assigneeId: selected.assigned_to,
    assigneeIds: selected.work_order_assignments?.map((assignment) => assignment.user_id).filter(Boolean),
    teamId: selected.team_id,
    assignedTeamIds: selected.work_order_assignments?.map((assignment) => assignment.team_id).filter(Boolean),
    teamIds,
  };
  const canEditDetails = canAccessRecord(grants, "work_orders.edit", record);
  const canChangeStatus = canAccessRecord(
    grants,
    "work_orders.change_status",
    record,
  );
  const canEditPriority = canAccessRecord(grants, "work_orders.edit", record);
  const canViewComments = canAccessRecord(
    grants,
    "work_orders.view_comments",
    record,
  );
  const canUseMoreActions = canEditDetails || canChangeStatus || canViewComments || onToggleRead;
  return (
    <section className="detail-pane">
      <header className="detail-header">
        <div className="detail-heading">
          <div className="detail-title-row">
            <h2>{selected.title}</h2>
            <button className="icon-button" aria-label="Copy work order link">
              <Copy size={15} />
            </button>
          </div>
          <div className="detail-meta">
            <CalendarDays size={14} /> Due by {selected.due} <span>·</span>{" "}
            #{selected.work_order_number}
          </div>
        </div>
        <div className="detail-actions">
          {canViewComments && (
            <button className="button button-secondary">
              <MessageCircle size={15} /> Comments
            </button>
          )}
          {canChangeStatus && (
            <Button
              onClick={onMarkDone}
              disabled={selected.status === "Completed"}
            >
              <Check size={15} />{" "}
              {selected.status === "Completed" ? "Completed" : "Mark as done"}
            </Button>
          )}
          {canUseMoreActions && (
            <div className="work-order-review-menu" ref={menuRef}>
              <button type="button" className="icon-button" aria-label="More work order actions" aria-haspopup="menu" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)}>
                <EllipsisVertical size={17} />
              </button>
              {isMenuOpen && <div className="work-order-detail-menu" role="menu" aria-label="Work Order actions">
                <button type="button" role="menuitem" disabled={isSavingReadState} onClick={async () => { await onToggleRead(selected); setIsMenuOpen(false); }}>
                  <MailOpen size={15} /> Mark as {selected.is_read ? "unread" : "read"}
                </button>
              </div>}
            </div>
          )}
        </div>
      </header>
      <div className="detail-scroll">
        <div className="detail-status-row">
          <Badge tone={statusTone[selected.status]}>{selected.status}</Badge>
          {canEditPriority && (
            <button className="status-select">
              <CircleDot size={13} /> {selected.priority ?? "None"} priority{" "}
              <ChevronDown size={13} />
            </button>
          )}
        </div>
        <div className="detail-card">
          <h3>Details</h3>
          <DetailRow icon={ClipboardList} label="Work type">
            {selected.workType}
          </DetailRow>
          <DetailRow icon={MapPin} label="Location">
            {selected.location}
          </DetailRow>
          <DetailRow icon={CircleDot} label="Asset">
            {selected.asset}
          </DetailRow>
          <DetailRow icon={Users} label="Assigned to">
            <span className="detail-person">
              <Avatar
                className="avatar-blue"
                name={selected.assignee}
                alt={selected.assignee}
              />{" "}
              {selected.assignedTeam}
            </span>
          </DetailRow>
          <DetailRow icon={Clock3} label="Created">
            {selected.created_at
              ? new Date(selected.created_at).toLocaleDateString()
              : "Not available"}
          </DetailRow>
        </div>
        <div className="detail-card">
          <div className="section-heading">
            <h3>Description</h3>
            {canEditDetails && <button className="text-button">Edit</button>}
          </div>
          <p className="detail-copy">
            {selected.description || "No description available."}
          </p>
          <div className="attachment-row">
            <Paperclip size={15} /> No attachments yet
          </div>
        </div>
        <div className="detail-card activity-card">
          <div className="section-heading">
            <h3>Activity</h3>
            <button className="text-button" disabled>
              View all
            </button>
          </div>
          <div className="user-profile-empty">
            <Clock3 size={30} aria-hidden="true" />
            <p>No activity available.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
