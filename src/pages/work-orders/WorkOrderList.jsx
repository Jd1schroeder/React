import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  CirclePause,
  LockKeyhole,
  Filter,
  Image as ImageIcon,
  MailCheck,
  Plus,
  RotateCw,
  Users,
} from "lucide-react";

const statusOptions = [
  { value: "Open", label: "Open", icon: LockKeyhole, tone: "open" },
  { value: "On Hold", label: "On Hold", icon: CirclePause, tone: "on-hold" },
  { value: "In Progress", label: "In Progress", icon: RotateCw, tone: "in-progress" },
  { value: "Completed", label: "Done", icon: Check, tone: "completed" },
];

function preloadWorkOrderThumbnails(orders) {
  if (typeof Image === "undefined") return Promise.resolve();
  const thumbnailUrls = orders.map((order) => {
    const thumbnail = order.work_order_attachments?.find((attachment) => attachment.kind === "image" && attachment.is_thumbnail)
      ?? order.work_order_attachments?.find((attachment) => attachment.kind === "image");
    return thumbnail?.signed_url;
  }).filter(Boolean);
  return Promise.all(thumbnailUrls.map((url) => new Promise((resolve) => {
    const image = new Image();
    const finish = () => resolve();
    image.onload = finish;
    image.onerror = finish;
    image.src = url;
    if (image.complete) finish();
  })));
}

function WorkOrderStatusMenu({ order, onStatusChange, canChangeStatus }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const currentStatus = statusOptions.find((status) => status.value === order.status);

  useLayoutEffect(() => {
    if (!isOpen || !rootRef.current || !menuRef.current) return;
    const scrollport = rootRef.current.closest(".work-order-list");
    if (!scrollport) return;
    const controlRect = rootRef.current.getBoundingClientRect();
    const scrollportRect = scrollport.getBoundingClientRect();
    const menuHeight = menuRef.current.getBoundingClientRect().height;
    const roomBelow = scrollportRect.bottom - controlRect.bottom;
    const roomAbove = controlRect.top - scrollportRect.top;
    setOpenUp(roomBelow < menuHeight && roomAbove > roomBelow);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const CurrentIcon = currentStatus?.icon ?? Circle;
  const selectStatus = async (status) => {
    if (status.value === order.status || isSaving) {
      setIsOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await onStatusChange(order, status.value);
      setIsOpen(false);
    } catch {
      // The Work Orders page owns and displays persistence errors.
    } finally {
      setIsSaving(false);
    }
  };

  if (!canChangeStatus) {
    return <span className={`work-order-status-static ${currentStatus?.tone ?? ""}`}><CurrentIcon size={12} />{currentStatus?.label ?? order.status}</span>;
  }

  return (
    <div className="work-order-status-control" ref={rootRef}>
      <button type="button" className={`work-order-status-trigger ${currentStatus?.tone ?? ""}`} aria-haspopup="menu" aria-expanded={isOpen} disabled={isSaving} onClick={() => setIsOpen((open) => !open)}>
        <CurrentIcon size={12} />
        {currentStatus?.label ?? order.status}
        <ChevronDown size={12} className={isOpen ? "rotated" : ""} />
      </button>
      {isOpen && (
        <div ref={menuRef} className={`work-order-status-menu ${openUp ? "open-up" : ""}`} role="menu" aria-label="Work Order status">
          {statusOptions.map((status) => {
            const StatusIcon = status.icon;
            const selected = status.value === order.status;
            return (
              <button key={status.value} type="button" role="menuitemradio" aria-checked={selected} className={`work-order-status-option ${status.tone} ${selected ? "selected" : ""}`} disabled={isSaving} onClick={() => selectStatus(status)}>
                <StatusIcon size={13} />
                <span>{status.label}</span>
                {selected ? <CircleCheck size={16} className="status-option-selected-icon" /> : <Circle size={16} className="status-option-empty-icon" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkOrderListItem({ order, selected, isRead, onSelect, onStatusChange, canChangeStatus }) {
  const thumbnail = order.work_order_attachments?.find((attachment) => attachment.kind === "image" && attachment.is_thumbnail)
    ?? order.work_order_attachments?.find((attachment) => attachment.kind === "image");
  return (
    <article className={`work-order-item ${selected ? "selected" : ""}`} onClick={() => onSelect(order)}>
      <button type="button" className="work-order-item-thumbnail" aria-label={`Open ${order.title}`} onClick={(event) => { event.stopPropagation(); onSelect(order); }}>
        {thumbnail?.signed_url
          ? <img src={thumbnail.signed_url} alt="" loading="lazy" />
          : thumbnail
            ? <span className="work-order-thumbnail-skeleton" aria-hidden="true" />
            : <ImageIcon size={20} strokeWidth={1.7} />}
      </button>
      <button type="button" className="work-order-item-main" aria-current={selected ? "true" : undefined} onClick={(event) => { event.stopPropagation(); onSelect(order); }}>
        <span className="order-item-top">
          <span className={`order-title ${isRead ? "reviewed" : "unreviewed"}`}>{order.title}</span>
          <span className={`priority priority-${(order.priority ?? "none").toLowerCase()}`} aria-label={`${order.priority ?? "None"} priority`}><i /></span>
        </span>
        <span className="order-item-meta"><span>Requested by {order.requester}</span><span>#{order.work_order_number}</span></span>
      </button>
      <div className="order-item-bottom">
        <WorkOrderStatusMenu order={order} onStatusChange={onStatusChange} canChangeStatus={canChangeStatus} />
        <span>{order.due}</span>
      </div>
    </article>
  );
}

export function WorkOrderList({
  activeTab,
  setActiveTab,
  search,
  groupCounts,
  readStatusById,
  selected,
  onSelect,
  onOrdersLoaded,
  onLoadGroupPage,
  onHydrateAttachments,
  refreshVersion,
  onStatusChange,
  canChangeStatusForOrder,
  onReadAll,
  isReadAllSaving = false,
  sortId,
  onSortChange,
  unreadFirst,
  onUnreadFirstChange,
}) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groupPages, setGroupPages] = useState({});
  const [groupLoading, setGroupLoading] = useState({});
  const [groupErrors, setGroupErrors] = useState({});
  const queryGeneration = useRef(0);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [expandedSortGroup, setExpandedSortGroup] = useState("priority");
  const sortMenuRef = useRef(null);
  const readAllButtonRef = useRef(null);
  const [isReadAllTooltipVisible, setIsReadAllTooltipVisible] = useState(false);
  const [readAllTooltipPosition, setReadAllTooltipPosition] = useState(null);
  const measureReadAllTooltip = useCallback(() => {
    const rect = readAllButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tooltipHalfWidth = 76;
    setReadAllTooltipPosition({
      left: Math.min(Math.max(rect.left + rect.width / 2, tooltipHalfWidth + 8), window.innerWidth - tooltipHalfWidth - 8),
      top: rect.bottom + 8,
    });
  }, []);
  useEffect(() => {
    if (!isReadAllTooltipVisible) return undefined;
    window.addEventListener("resize", measureReadAllTooltip);
    window.addEventListener("scroll", measureReadAllTooltip, true);
    return () => {
      window.removeEventListener("resize", measureReadAllTooltip);
      window.removeEventListener("scroll", measureReadAllTooltip, true);
    };
  }, [isReadAllTooltipVisible, measureReadAllTooltip]);
  const showReadAllTooltip = () => {
    measureReadAllTooltip();
    setIsReadAllTooltipVisible(true);
  };
  const hideReadAllTooltip = () => {
    setIsReadAllTooltipVisible(false);
    setReadAllTooltipPosition(null);
  };
  const groups = activeTab === "Done"
    ? [{ id: "completed", label: "Completed work orders" }]
    : [
        { id: "assigned-to-me", label: "Assigned to Me" },
        { id: "assigned-to-my-teams", label: "Assigned to My Teams" },
        { id: "created-by-me", label: "Created by Me" },
        { id: "all-open", label: "All Open Work Orders" },
      ];

  const loadGroup = async (group, reset = false) => {
    if (groupLoading[group] && !reset) return;
    const generation = queryGeneration.current;
    const offset = reset ? 0 : (groupPages[group]?.orders.length ?? 0);
    setGroupLoading((current) => ({ ...current, [group]: true }));
    setGroupErrors((current) => ({ ...current, [group]: "" }));
    try {
      const orders = await onLoadGroupPage({ tab: activeTab, group, sort: sortId, unreadFirst, offset });
      if (generation !== queryGeneration.current) return;
      setGroupPages((current) => ({ ...current, [group]: { orders: reset ? orders : [...(current[group]?.orders ?? []), ...orders] } }));
      onOrdersLoaded(orders);
      if (onHydrateAttachments) {
        void onHydrateAttachments(orders).then(async (hydratedOrders) => {
          if (generation !== queryGeneration.current) return;
          await preloadWorkOrderThumbnails(hydratedOrders);
          if (generation !== queryGeneration.current) return;
          const hydratedById = new Map(hydratedOrders.map((order) => [order.id, order.work_order_attachments]));
          setGroupPages((current) => {
            const page = current[group];
            if (!page) return current;
            return {
              ...current,
              [group]: {
                ...page,
                orders: page.orders.map((order) => hydratedById.has(order.id)
                  ? { ...order, work_order_attachments: hydratedById.get(order.id) }
                  : order),
              },
            };
          });
          onOrdersLoaded(hydratedOrders);
        }).catch(() => {});
      }
    } catch (error) {
      if (generation === queryGeneration.current) setGroupErrors((current) => ({ ...current, [group]: error.message || "Unable to load Work Orders." }));
    } finally {
      if (generation === queryGeneration.current) setGroupLoading((current) => ({ ...current, [group]: false }));
    }
  };

  useEffect(() => {
    queryGeneration.current += 1;
    setGroupPages({});
    setGroupErrors({});
    setGroupLoading({});
    for (const group of groups) {
      if (expandedGroups[group.id]) loadGroup(group.id, true);
    }
    // Changing filters/sort/records invalidates the page cursor and reloads open groups.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, sortId, unreadFirst, refreshVersion]);

  useEffect(() => {
    if (!sortMenuOpen) return undefined;
    const dismiss = (event) => {
      if (!sortMenuRef.current?.contains(event.target)) setSortMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSortMenuOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sortMenuOpen]);

  const renderOrder = (order) => (
    <WorkOrderListItem
      key={order.id}
      order={order}
      isRead={Boolean(readStatusById[order.id]?.is_read ?? order.is_read)}
      selected={selected?.id === order.id}
      onSelect={onSelect}
      onStatusChange={onStatusChange}
      canChangeStatus={canChangeStatusForOrder(order)}
    />
  );

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
        <div className="work-order-sort-control" ref={sortMenuRef}>
          <button className="work-order-sort-trigger" aria-expanded={sortMenuOpen} aria-haspopup="menu" onClick={() => {
            if (!sortMenuOpen) {
              setExpandedSortGroup(sortGroups.find((group) => group.options.some((option) => option.id === sortId))?.id ?? "priority");
            }
            setSortMenuOpen((open) => !open);
          }}>
            {sortLabels[sortId]} {sortMenuOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {sortMenuOpen && (
            <div className="work-order-sort-menu" role="menu" aria-label="Sort Work Orders">
              <div className="sort-unread-row">
                <span>Unread first</span>
                <button type="button" className="sort-unread-toggle" role="switch" aria-checked={unreadFirst} aria-label="Unread first" onClick={() => onUnreadFirstChange(!unreadFirst)} />
              </div>
              {sortGroups.map((group) => (
                <section className="sort-menu-group" key={group.id}>
                  <button type="button" className="sort-menu-group-heading" aria-expanded={expandedSortGroup === group.id} onClick={() => setExpandedSortGroup((current) => current === group.id ? null : group.id)}>
                    <ChevronDown size={13} className={expandedSortGroup === group.id ? "expanded" : ""} />
                    {group.label}
                  </button>
                  {expandedSortGroup === group.id && <div className="sort-menu-options">
                    {group.options.map((option) => (
                      <button type="button" role="menuitemradio" aria-checked={sortId === option.id} className={`sort-menu-option ${sortId === option.id ? "selected" : ""}`} key={option.id} onClick={() => { onSortChange(option.id); setExpandedSortGroup(group.id); }}>
                        {option.label}
                      </button>
                    ))}
                  </div>}
                </section>
              ))}
            </div>
          )}
        </div>
        <div className="work-order-list-options">
          <button ref={readAllButtonRef} type="button" className="icon-button" aria-label="Mark all as read" disabled={isReadAllSaving || (groupCounts[activeTab === "Done" ? "completed" : "all-open"] ?? 0) === 0} onMouseEnter={showReadAllTooltip} onMouseLeave={hideReadAllTooltip} onFocus={showReadAllTooltip} onBlur={hideReadAllTooltip} onClick={() => { void onReadAll(); }}>
            <MailCheck size={17} />
          </button>
        </div>
      </div>
      <div className="work-order-list">
        {groups.map((group) => {
          const expanded = expandedGroups[group.id] ?? false;
          return (
            <section className="work-order-group" key={group.id}>
          <button
            className={`work-order-assignment-heading ${expanded ? "expanded" : ""}`}
            aria-expanded={expanded}
            onClick={() => {
              setExpandedGroups((current) => ({ ...current, [group.id]: !expanded }));
              if (!expanded && groupPages[group.id] == null) loadGroup(group.id, true);
            }}
          >
                <span>{group.label} ({groupCounts[group.id] ?? 0})</span>
                <ChevronDown size={15} />
              </button>
              {expanded && <>
                {(groupPages[group.id]?.orders ?? []).map(renderOrder)}
                {groupLoading[group.id] && <div className="list-empty">Loading Work Orders...</div>}
                {groupErrors[group.id] && <div className="list-empty" role="alert">{groupErrors[group.id]}</div>}
                {!groupLoading[group.id] && !groupErrors[group.id] && (groupPages[group.id]?.orders.length ?? 0) === 0 && <div className="list-empty">No work orders in this group.</div>}
                {!groupLoading[group.id] && (groupPages[group.id]?.orders.length ?? 0) < (groupCounts[group.id] ?? 0) && <button type="button" className="work-order-show-more" onClick={() => loadGroup(group.id)}>Show more</button>}
              </>}
            </section>
          );
        })}
      </div>
      {isReadAllTooltipVisible && readAllTooltipPosition && createPortal(
        <div className="work-order-read-tooltip" role="tooltip" style={{ left: readAllTooltipPosition.left, top: readAllTooltipPosition.top }}>Mark all as read</div>,
        document.body,
      )}
    </section>
  );
}

const sortGroups = [
  { id: "creation", label: "Creation Date", options: [{ id: "created-oldest", label: "Oldest First" }, { id: "created-newest", label: "Newest First" }] },
  { id: "due", label: "Due Date", options: [{ id: "due-earliest", label: "Earliest First" }, { id: "due-latest", label: "Latest First" }] },
  { id: "updated", label: "Last Updated", options: [{ id: "updated-oldest", label: "Least Recent First" }, { id: "updated-newest", label: "Most Recent First" }] },
  { id: "priority", label: "Priority", options: [{ id: "priority-highest", label: "Highest First" }, { id: "priority-lowest", label: "Lowest First" }] },
];

const sortLabels = Object.fromEntries(sortGroups.flatMap((group) => group.options.map((option) => [option.id, `${group.label}: ${option.label}`])));

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
