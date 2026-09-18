import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  ClipboardList,
  Clock3,
  Copy,
  Filter,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  PanelLeft,
  Plus,
  Users,
} from "lucide-react";
import './WorkOrders.css';
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PanelLayout } from "../components/layout/PanelLayout";
import { PanelOverflowButton, PanelRecordNotFound } from "../components/layout/PanelView";

const statusTone = {
  Open: "blue",
  "In Progress": "orange",
  Completed: "green",
  "On Hold": "purple",
};

const workOrders = [];
const workOrderCounts = { todo: 0, done: 0 };

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="detail-row">
      <Icon size={16} strokeWidth={1.8} />
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children}</span>
    </div>
  );
}

export function WorkOrders({ recordId, onNavigateRecord }) {
  const [activeTab, setActiveTab] = useState("To Do");
  const [localSelectedId, setLocalSelectedId] = useState(workOrders[0]?.id);
  const selectedId = recordId ?? localSelectedId;
  const [search, setSearch] = useState("");
  const visibleOrders = useMemo(() => {
    const tabOrders = activeTab === "Done"
      ? workOrders.filter((order) => order.status === "Completed")
      : workOrders.filter((order) => order.status !== "Completed");
    const normalizedSearch = search.trim().toLowerCase();
    return normalizedSearch
      ? tabOrders.filter((order) => `${order.title} ${order.id} ${order.location}`.toLowerCase().includes(normalizedSearch))
      : tabOrders;
  }, [activeTab, search]);
  const selected = recordId
    ? workOrders.find((order) => order.id === selectedId)
    : visibleOrders[0] ?? workOrders[0];
  const missingRecord = Boolean(recordId && !selected);

  return (
    <PanelLayout
      title="Work orders"
      modeLabel="To Do View"
      modeIcon={PanelLeft}
      searchValue={search}
      onSearch={setSearch}
      searchPlaceholder="Search Work Orders"
      actionLabel="New work order"
      className="work-orders-page"
      bodyClassName="work-orders-layout"
      subnavigation={<div className="work-order-actions">
          <button className="filter-button">
            <Users size={14} /> Assigned to
          </button>
          <button className="filter-button">
            <CalendarDays size={14} /> Due date
          </button>
          <button className="filter-button">
            <Plus size={14} /> Add filter
          </button>
          <button className="filter-button">
            <Filter size={14} /> My filters
          </button>
        </div>}
    >
        <section className="inbox-pane">
          <div className="work-order-tabs">
            <button
              className={activeTab === "To Do" ? "selected" : ""}
              onClick={() => setActiveTab("To Do")}
            >
              To Do <span>{workOrderCounts.todo}</span>
            </button>
            <button
              className={activeTab === "Done" ? "selected" : ""}
              onClick={() => setActiveTab("Done")}
            >
              Done <span>{workOrderCounts.done}</span>
            </button>
          </div>
          <div className="work-order-sort-row">
            <span>Sort By:</span>
            <button>Priority: Highest First <ChevronDown size={12} /></button>
            <button className="icon-button" aria-label="List options"><MoreHorizontal size={17} /></button>
          </div>
          <div className="work-order-assignment-heading">
            <span>{activeTab === "Done" ? "Completed work orders" : `Assigned to Me (${visibleOrders.length})`}</span>
            <ChevronUp size={15} />
          </div>
          <div className="work-order-list">
            {visibleOrders.map((order) => (
              <button
                key={order.id}
                className={`work-order-item ${selected?.id === order.id ? "selected" : ""}`}
                onClick={() => {
                  setLocalSelectedId(order.id);
                  onNavigateRecord?.('workorders', order.id);
                }}
              >
                <div className="order-item-top">
                  <span className="order-title">{order.title}</span>
                  <span
                    className={`priority priority-${order.priority.toLowerCase()}`}
                  >
                    <i />
                  </span>
                </div>
                <div className="order-item-meta">
                  <span>
                    Requested by{" "}
                    {order.requester}
                  </span>
                  <span>{order.id}</span>
                </div>
                <div className="order-item-bottom">
                  <Badge tone={statusTone[order.status]}>{order.status}</Badge>
                  <span>{order.due}</span>
                </div>
              </button>
            ))}
            {visibleOrders.length === 0 && (
              <div className="list-empty">No work orders match this view.</div>
            )}
          </div>
        </section>
        <section className="detail-pane">
          {missingRecord ? (
            <PanelRecordNotFound />
          ) : selected && (
            <>
              <header className="detail-header">
                <div className="detail-heading">
                  <div className="detail-title-row">
                    <h2>{selected.title}</h2>
                    <button
                      className="icon-button"
                      aria-label="Copy work order link"
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                  <div className="detail-meta">
                    <CalendarDays size={14} /> Due by {selected.due}{" "}
                    <span>·</span> {selected.id}
                  </div>
                </div>
                <div className="detail-actions">
                  <button className="button button-secondary">
                    <MessageCircle size={15} /> Comments (7)
                  </button>
                  <Button>
                    <Check size={15} /> Mark as done
                  </Button>
                  <PanelOverflowButton label="More work order actions" />
                </div>
              </header>
              <div className="detail-scroll">
                <div className="detail-status-row">
                  <Badge tone={statusTone[selected.status]}>
                    {selected.status}
                  </Badge>
                  <button className="status-select">
                    <CircleDot size={13} /> {selected.priority} priority{" "}
                    <ChevronDown size={13} />
                  </button>
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
                      <span className="avatar avatar-blue">
                        {selected.assignee}
                      </span>{" "}
                      {selected.assignedTeam}
                    </span>
                  </DetailRow>
                  <DetailRow icon={Clock3} label="Created">
                    {selected.created}
                  </DetailRow>
                </div>
                <div className="detail-card">
                  <div className="section-heading">
                    <h3>Description</h3>
                    <button className="text-button">Edit</button>
                  </div>
                  <p className="detail-copy">
                    {selected.description}
                  </p>
                  <div className="attachment-row">
                    <Paperclip size={15} /> {selected.attachments ? `${selected.attachments} attachments` : "No attachments yet"}
                  </div>
                </div>
                <div className="detail-card activity-card">
                  <div className="section-heading">
                    <h3>Activity</h3>
                    <button className="text-button">View all</button>
                  </div>
                  <div className="activity">
                    <div className="avatar avatar-blue">JD</div>
                    <p>
                      <strong>Jordan Davis</strong> commented on this work order
                      <small>34 minutes ago</small>
                    </p>
                  </div>
                  <div className="activity">
                    <div className="avatar avatar-green">MK</div>
                    <p>
                      <strong>Maria Kim</strong> updated the status to{" "}
                      <b>{selected.status}</b>
                      <small>1 hour ago</small>
                    </p>
                  </div>
                  <label className="comment-box">
                    <input placeholder="Add a comment..." />
                    <button aria-label="Send comment">
                      <MessageCircle size={16} />
                    </button>
                  </label>
                </div>
              </div>
            </>
          )}
        </section>
    </PanelLayout>
  );
}
