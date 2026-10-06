import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/ui/Button";
import { PriorityBadge } from "../../components/ui/PriorityBadge";
import "./WorkOrderList.css";
import {
  CalendarDays,
  Check,
  ChevronDown,
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
  {
    value: "In Progress",
    label: "In Progress",
    icon: RotateCw,
    tone: "in-progress",
  },
  { value: "Completed", label: "Done", icon: Check, tone: "completed" },
];

function WorkOrderStatusMenu({ order, onStatusChange, canChangeStatus }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const currentStatus = statusOptions.find(
    (status) => status.value === order.status,
  );

  useLayoutEffect(() => {
    if (!isOpen || !rootRef.current || !menuRef.current) return;
    const updatePosition = () => {
      if (!rootRef.current || !menuRef.current) return;
      const scrollport = rootRef.current.closest(".work-order-list");
      const controlRect = rootRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const scrollportRect = scrollport?.getBoundingClientRect();
      const style = getComputedStyle(rootRef.current);
      const gap = Number.parseFloat(style.getPropertyValue("--spacing-2")) || 0;
      const topBoundary = Math.max(0, scrollportRect?.top ?? 0);
      const bottomBoundary = Math.min(
        window.innerHeight,
        scrollportRect?.bottom ?? window.innerHeight,
      );
      const roomBelow = Math.max(0, bottomBoundary - controlRect.bottom - gap);
      const roomAbove = Math.max(0, controlRect.top - topBoundary - gap);
      const shouldOpenUp = roomBelow < menuRect.height && roomAbove > roomBelow;
      const availableHeight = Math.max(
        80,
        shouldOpenUp ? roomAbove : roomBelow,
      );
      const height = Math.min(menuRef.current.scrollHeight, availableHeight);
      const left = Math.max(
        0,
        Math.min(controlRect.left, window.innerWidth - menuRect.width),
      );
      const top = shouldOpenUp
        ? Math.max(topBoundary, controlRect.top - gap - height)
        : Math.min(controlRect.bottom + gap, bottomBoundary - height);
      setOpenUp(shouldOpenUp);
      setMenuPosition({ top, left, maxHeight: availableHeight });
    };
    updatePosition();
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const dismiss = (event) => {
      if (
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      )
        setIsOpen(false);
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
    return (
      <span className={`work-order-status-static ${currentStatus?.tone ?? ""}`}>
        <CurrentIcon size={12} />
        <span className="work-order-status-label">
          {currentStatus?.label ?? order.status}
        </span>
      </span>
    );
  }

  return (
    <div className="work-order-status-control" ref={rootRef}>
      <button
        type="button"
        className={`work-order-status-trigger ${currentStatus?.tone ?? ""}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isSaving}
        onClick={() => setIsOpen((open) => !open)}
      >
        <CurrentIcon size={12} />
        <span className="work-order-status-label">
          {currentStatus?.label ?? order.status}
        </span>
        <ChevronDown size={12} className={isOpen ? "rotated" : ""} />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`work-order-status-menu ${openUp ? "open-up" : ""}`}
            role="menu"
            aria-label="Work Order status"
            style={{
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              maxHeight: menuPosition?.maxHeight,
              visibility: menuPosition ? "visible" : "hidden",
            }}
          >
            {statusOptions.map((status) => {
              const StatusIcon = status.icon;
              const selected = status.value === order.status;
              return (
                <button
                  key={status.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`work-order-status-option ${status.tone} ${selected ? "selected" : ""}`}
                  disabled={isSaving}
                  onClick={() => selectStatus(status)}
                >
                  <StatusIcon size={13} />
                  <span>{status.label}</span>
                  {selected ? (
                    <CircleCheck
                      size={16}
                      className="status-option-selected-icon"
                    />
                  ) : (
                    <Circle size={16} className="status-option-empty-icon" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

function WorkOrderListItem({
  order,
  selected,
  isRead,
  onSelect,
  onStatusChange,
  canChangeStatus,
}) {
  const thumbnail =
    order.work_order_attachments?.find(
      (attachment) => attachment.kind === "image" && attachment.is_thumbnail,
    ) ??
    order.work_order_attachments?.find(
      (attachment) => attachment.kind === "image",
    );
  return (
    <div
      className={`work-order-item ${selected ? "selected" : ""}`}
      aria-selected={selected}
      onClick={() => onSelect(order)}
    >
      <a
        className="work-order-item-link"
        href={`/workorders/${order.id}`}
        aria-label={`Open ${order.title}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelect(order);
        }}
      />
      <div className="work-order-item-thumbnail-wrapper">
        <div className="work-order-item-thumbnail" aria-hidden="true">
          {thumbnail?.signed_url ? (
            <img
              src={thumbnail.signed_url}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : thumbnail ? (
            <span className="work-order-thumbnail-skeleton" />
          ) : (
            <ImageIcon size={20} strokeWidth={1.7} />
          )}
        </div>
      </div>
      <div className="work-order-item-content">
        <div className="work-order-item-title-row">
          <div className="work-order-item-title-wrapper">
            <div
              className={`work-order-item-title ${isRead ? "reviewed" : "unreviewed"}`}
              title={order.title}
            >
              {order.title}
            </div>
          </div>
          <div className="work-order-item-assignees" aria-label="Assignees" />
        </div>
        <div className="work-order-item-sub-row work-order-item-requester-row">
          <div className="work-order-item-secondary work-order-item-requester">
            Requested by {order.requester}
          </div>
          <div className="work-order-item-secondary">
            #{order.work_order_number}
          </div>
        </div>
        <div className="work-order-item-sub-row work-order-item-status-row">
          <WorkOrderStatusMenu
            order={order}
            onStatusChange={onStatusChange}
            canChangeStatus={canChangeStatus}
          />
          <div className="work-order-item-tags">
            <PriorityBadge priority={order.priority} />
          </div>
        </div>
      </div>
    </div>
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
  const [showEmptyCategories, setShowEmptyCategories] = useState(false);
  const [groupPages, setGroupPages] = useState({});
  const [groupLoading, setGroupLoading] = useState({});
  const [groupErrors, setGroupErrors] = useState({});
  const queryGeneration = useRef(0);
  const pendingGroupLoads = useRef(new Map());
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
      left: Math.min(
        Math.max(rect.left + rect.width / 2, tooltipHalfWidth + 8),
        window.innerWidth - tooltipHalfWidth - 8,
      ),
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
  const groups =
    activeTab === "Done"
      ? [{ id: "completed", label: "Completed work orders" }]
      : [
          { id: "assigned-to-me", label: "Assigned to Me" },
          { id: "assigned-to-my-teams", label: "Assigned to My Teams" },
          { id: "created-by-me", label: "Created by Me" },
          { id: "all-open", label: "All Open Work Orders" },
        ];
  const visibleGroups = showEmptyCategories
    ? groups
    : groups.filter((group) => (groupCounts[group.id] ?? 0) > 0);
  const hasHiddenEmptyCategories = groups.some(
    (group) => (groupCounts[group.id] ?? 0) === 0,
  );
  const allVisibleGroupsCollapsed = visibleGroups.every(
    (group) => !expandedGroups[group.id],
  );
  const selectedSortGroup = sortGroups.find((group) =>
    group.options.some((option) => option.id === sortId),
  );
  const selectedSort = selectedSortGroup?.options.find(
    (option) => option.id === sortId,
  );

  const loadGroup = (group, reset = false) => {
    const generation = queryGeneration.current;
    const offset = reset ? 0 : (groupPages[group]?.orders.length ?? 0);
    const requestKey = `${generation}:${group}:${offset}`;
    const pendingRequest = pendingGroupLoads.current.get(requestKey);
    if (pendingRequest) return pendingRequest;
    if (groupLoading[group] && !reset) return Promise.resolve();

    const request = (async () => {
      setGroupLoading((current) => ({ ...current, [group]: true }));
      setGroupErrors((current) => ({ ...current, [group]: "" }));
      try {
        const orders = await onLoadGroupPage({
          tab: activeTab,
          group,
          sort: sortId,
          unreadFirst,
          offset,
        });
        if (generation !== queryGeneration.current) return;
        setGroupPages((current) => ({
          ...current,
          [group]: {
            orders: reset
              ? orders
              : [...(current[group]?.orders ?? []), ...orders],
          },
        }));
        onOrdersLoaded(orders);
        if (onHydrateAttachments) {
          void onHydrateAttachments(orders)
            .then((hydratedOrders) => {
              if (generation !== queryGeneration.current) return;
              const hydratedById = new Map(
                hydratedOrders.map((order) => [
                  order.id,
                  order.work_order_attachments,
                ]),
              );
              setGroupPages((current) => {
                const page = current[group];
                if (!page) return current;
                return {
                  ...current,
                  [group]: {
                    ...page,
                    orders: page.orders.map((order) =>
                      hydratedById.has(order.id)
                        ? {
                            ...order,
                            work_order_attachments: hydratedById.get(order.id),
                          }
                        : order,
                    ),
                  },
                };
              });
              onOrdersLoaded(hydratedOrders);
            })
            .catch(() => {});
        }
        return orders;
      } catch (error) {
        if (generation === queryGeneration.current)
          setGroupErrors((current) => ({
            ...current,
            [group]: error.message || "Unable to load Work Orders.",
          }));
      } finally {
        pendingGroupLoads.current.delete(requestKey);
        if (generation === queryGeneration.current)
          setGroupLoading((current) => ({ ...current, [group]: false }));
      }
    })();
    pendingGroupLoads.current.set(requestKey, request);
    return request;
  };

  const prefetchGroup = (group) => {
    if (
      (groupCounts[group] ?? 0) === 0 ||
      groupPages[group] != null ||
      groupLoading[group] ||
      groupErrors[group]
    )
      return;
    void loadGroup(group, true);
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
        {["To Do", "Done"].map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              className={`work-order-tab${isSelected ? " selected" : ""}`}
              disabled={isSelected}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              <div className="work-order-tab-content">
                <div className="work-order-tab-badge-spacer"></div>
                <span className="work-order-tab-title" title={tab}>
                  {tab}
                </span>
                <div className="work-order-tab-badge-spacer" />
              </div>
            </button>
          );
        })}
      </div>
      <div className="work-order-list">
        <div className="work-order-sort-row">
          <div className="work-order-sort-selector">
            <div className="work-order-sort-root" ref={sortMenuRef}>
              <span className="work-order-sort-label">Sort By:</span>
              <div className="work-order-sort-popover">
                <div>
                  <button
                    type="button"
                    className="work-order-sort-trigger"
                    aria-expanded={sortMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => {
                      if (!sortMenuOpen) {
                        setExpandedSortGroup(
                          selectedSortGroup?.id ?? "priority",
                        );
                      }
                      setSortMenuOpen((open) => !open);
                    }}
                  >
                    <span className="work-order-sort-selected-label">
                      <span className="work-order-sort-selected-emphasis">
                        {selectedSortGroup?.label ?? "Priority"}
                      </span>
                      : {selectedSort?.label ?? "Highest First"}
                    </span>
                    <div className="work-order-sort-chevron">
                      <ChevronDown
                        size={15}
                        className={sortMenuOpen ? "expanded" : ""}
                      />
                    </div>
                  </button>
                </div>
                {sortMenuOpen && (
                  <div
                    className="work-order-sort-menu"
                    role="menu"
                    aria-label="Sort Work Orders"
                  >
                    <div className="sort-unread-row">
                      <span>Unread first</span>
                      <button
                        type="button"
                        className="sort-unread-toggle"
                        role="switch"
                        aria-checked={unreadFirst}
                        aria-label="Unread first"
                        onClick={() => onUnreadFirstChange(!unreadFirst)}
                      />
                    </div>
                    {sortGroups.map((group) => (
                      <section className="sort-menu-group" key={group.id}>
                        <button
                          type="button"
                          className="sort-menu-group-heading"
                          aria-expanded={expandedSortGroup === group.id}
                          onClick={() =>
                            setExpandedSortGroup((current) =>
                              current === group.id ? null : group.id,
                            )
                          }
                        >
                          <ChevronDown
                            size={13}
                            className={
                              expandedSortGroup === group.id ? "expanded" : ""
                            }
                          />
                          {group.label}
                        </button>
                        {expandedSortGroup === group.id && (
                          <div className="sort-menu-options">
                            {group.options.map((option) => (
                              <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={sortId === option.id}
                                className={`sort-menu-option ${sortId === option.id ? "selected" : ""}`}
                                key={option.id}
                                onClick={() => {
                                  onSortChange(option.id);
                                  setExpandedSortGroup(group.id);
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              ref={readAllButtonRef}
              type="button"
              className="icon-button work-order-mark-as-read"
              aria-label="Mark all as read"
              disabled={
                isReadAllSaving ||
                (groupCounts[activeTab === "Done" ? "completed" : "all-open"] ??
                  0) === 0
              }
              onMouseEnter={showReadAllTooltip}
              onMouseLeave={hideReadAllTooltip}
              onFocus={showReadAllTooltip}
              onBlur={hideReadAllTooltip}
              onClick={() => {
                void onReadAll();
              }}
            >
              <MailCheck size={20} />
            </button>
          </div>
        </div>
        {visibleGroups.map((group) => {
          const expanded = expandedGroups[group.id] ?? false;
          return (
            <section className="work-order-group" key={group.id}>
              <button
                className={`work-order-assignment-heading ${expanded ? "expanded" : ""}`}
                aria-expanded={expanded}
                onMouseEnter={() => prefetchGroup(group.id)}
                onFocus={() => prefetchGroup(group.id)}
                onClick={() => {
                  setExpandedGroups((current) => ({
                    ...current,
                    [group.id]: !expanded,
                  }));
                  if (!expanded) {
                    const loadedOrders = groupPages[group.id]?.orders;
                    if (loadedOrders) {
                      onOrdersLoaded(loadedOrders, { selectFirst: true });
                    } else {
                      void loadGroup(group.id, true).then((orders) => {
                        if (orders?.length)
                          onOrdersLoaded(orders, { selectFirst: true });
                      });
                    }
                  }
                }}
              >
                <span>
                  {group.label} ({groupCounts[group.id] ?? 0})
                </span>
                <ChevronDown size={15} />
              </button>
              {expanded && (
                <>
                  {(groupPages[group.id]?.orders ?? []).map(renderOrder)}
                  {groupLoading[group.id] && (
                    <div className="list-empty">Loading Work Orders...</div>
                  )}
                  {groupErrors[group.id] && (
                    <div className="list-empty" role="alert">
                      {groupErrors[group.id]}
                    </div>
                  )}
                  {!groupLoading[group.id] &&
                    !groupErrors[group.id] &&
                    (groupPages[group.id]?.orders.length ?? 0) === 0 && (
                      <div className="list-empty">
                        No work orders in this group.
                      </div>
                    )}
                  {!groupLoading[group.id] &&
                    (groupPages[group.id]?.orders.length ?? 0) <
                      (groupCounts[group.id] ?? 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="work-order-show-more"
                        onClick={() => loadGroup(group.id)}
                      >
                        <span className="work-order-show-more-content">
                          <p className="work-order-show-more-label">
                            Show more
                          </p>
                        </span>
                      </Button>
                    )}
                </>
              )}
            </section>
          );
        })}
        {hasHiddenEmptyCategories && allVisibleGroupsCollapsed && (
          <Button
            type="button"
            variant="ghost"
            className="work-order-empty-categories-toggle"
            aria-expanded={showEmptyCategories}
            onClick={() => setShowEmptyCategories((visible) => !visible)}
          >
            <span className="work-order-show-more-content">
              <p className="work-order-show-more-label">
                {showEmptyCategories ? "Show less" : "Show more"}
              </p>
            </span>
          </Button>
        )}
      </div>
      {isReadAllTooltipVisible &&
        readAllTooltipPosition &&
        createPortal(
          <div
            className="work-order-read-tooltip"
            role="tooltip"
            style={{
              left: readAllTooltipPosition.left,
              top: readAllTooltipPosition.top,
            }}
          >
            Mark all as read
          </div>,
          document.body,
        )}
    </section>
  );
}

const sortGroups = [
  {
    id: "creation",
    label: "Creation Date",
    options: [
      { id: "created-oldest", label: "Oldest First" },
      { id: "created-newest", label: "Newest First" },
    ],
  },
  {
    id: "due",
    label: "Due Date",
    options: [
      { id: "due-earliest", label: "Earliest First" },
      { id: "due-latest", label: "Latest First" },
    ],
  },
  {
    id: "updated",
    label: "Last Updated",
    options: [
      { id: "updated-oldest", label: "Least Recent First" },
      { id: "updated-newest", label: "Most Recent First" },
    ],
  },
  {
    id: "priority",
    label: "Priority",
    options: [
      { id: "priority-highest", label: "Highest First" },
      { id: "priority-lowest", label: "Lowest First" },
    ],
  },
];

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
