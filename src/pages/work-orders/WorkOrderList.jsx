import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Filter,
  Image as ImageIcon,
  MoreHorizontal,
  Plus,
  Users,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";

const statusTone = {
  Open: "blue",
  "In Progress": "orange",
  Completed: "green",
  "On Hold": "purple",
};

export function WorkOrderList({
  activeTab,
  setActiveTab,
  visibleOrders,
  selected,
  onSelect,
}) {
  return (
    <section className="inbox-pane">
      <div className="work-order-tabs">
        <button
          className={activeTab === "To Do" ? "selected" : ""}
          onClick={() => setActiveTab("To Do")}
        >
          To Do
        </button>
        <button
          className={activeTab === "Done" ? "selected" : ""}
          onClick={() => setActiveTab("Done")}
        >
          Done
        </button>
      </div>
      <div className="work-order-sort-row">
        <span>Sort By:</span>
        <button>
          Priority: Highest First <ChevronDown size={12} />
        </button>
        <button className="icon-button" aria-label="List options">
          <MoreHorizontal size={17} />
        </button>
      </div>
      <div className="work-order-assignment-heading">
        <span>
          {activeTab === "Done"
            ? "Completed work orders"
            : `Assigned to Me (${visibleOrders.length})`}
        </span>
        <ChevronUp size={15} />
      </div>
      <div className="work-order-list">
        {visibleOrders.map((order) => {
          const thumbnail = order.work_order_attachments?.find((attachment) => attachment.kind === "image" && attachment.is_thumbnail)
            ?? order.work_order_attachments?.find((attachment) => attachment.kind === "image");
          return (
            <button
              key={order.id}
              className={`work-order-item ${selected?.id === order.id ? "selected" : ""}`}
              onClick={() => onSelect(order)}
            >
              <span className="work-order-item-thumbnail" aria-hidden="true">
                {thumbnail?.signed_url
                  ? <img src={thumbnail.signed_url} alt="" loading="lazy" />
                  : <ImageIcon size={20} strokeWidth={1.7} />}
              </span>
              <span className="work-order-item-content">
                <span className="order-item-top">
                  <span className="order-title">{order.title}</span>
                  <span
                    className={`priority priority-${(order.priority ?? "none").toLowerCase()}`}
                    aria-label={`${order.priority ?? "None"} priority`}
                  >
                    <i />
                  </span>
                </span>
                <span className="order-item-meta">
                  <span>Requested by {order.requester}</span>
                  <span>{order.id}</span>
                </span>
                <span className="order-item-bottom">
                  <Badge tone={statusTone[order.status]}>{order.status}</Badge>
                  <span>{order.due}</span>
                </span>
              </span>
            </button>
          );
        })}
        {visibleOrders.length === 0 && (
          <div className="list-empty">No work orders match this view.</div>
        )}
      </div>
    </section>
  );
}

export function WorkOrderFilters() {
  return (
    <div className="work-order-actions">
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
    </div>
  );
}
