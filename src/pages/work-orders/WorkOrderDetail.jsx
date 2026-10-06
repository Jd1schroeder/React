import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Boxes,
  CirclePause,
  CalendarDays,
  Check,
  EllipsisVertical,
  FileDown,
  Link,
  LockKeyhole,
  LockKeyholeOpen,
  MapPin,
  MessageCircle,
  Pencil,
  Paperclip,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { PriorityBadge } from "../../components/ui/PriorityBadge";
import { PanelRecordNotFound } from "../../components/layout/PanelView";
import { canAccessRecord, hasPermission } from "../../services/authorizationService";
import { getRecordPath } from "../../routes.js";
import { WorkOrderPdfExportDialog } from "./WorkOrderPdfExportDialog";
import { WorkOrderActivity } from "./WorkOrderActivity";
import "./WorkOrderDetail.css";

const statusOptions = [
  { value: "Open", label: "Open", icon: LockKeyholeOpen },
  { value: "On Hold", label: "On Hold", className: "on-hold", icon: CirclePause },
  { value: "In Progress", label: "In Progress", icon: RefreshCw },
  { value: "Completed", label: "Done", className: "completed", icon: Check },
];

function WorkOrderDescription({ order }) {
  const [showAllPictures, setShowAllPictures] = useState(false);
  const attachments = order.work_order_attachments ?? [];
  const pictures = attachments.filter(
    (attachment) => attachment.kind === "image" || attachment.content_type?.startsWith("image/"),
  );
  const files = attachments.filter((attachment) => !pictures.includes(attachment));
  const visiblePictures = showAllPictures ? pictures : pictures.slice(0, 3);

  return (
    <>
      <div className="detail-description-row">
        <div className="detail-description-content">
          <div className="detail-section-header">
            <h2>Description</h2>
          </div>
          <div className="detail-description-copy">
            <span>{order.description || "No description available."}</span>
          </div>
        </div>
      </div>
      <div className="detail-attachments-row">
        {pictures.length > 0 && (
          <div className="detail-attachment-gallery">
            <ul className="detail-attachment-list" aria-label="Work Order pictures">
              {visiblePictures.map((picture, index) => (
                <li className="detail-attachment-item" key={picture.id}>
                  <div className="detail-attachment-image-link">
                    <div className="detail-attachment-ratio">
                      {picture.signed_url ? (
                        <img
                          className="detail-attachment-image"
                          src={picture.signed_url}
                          alt={picture.file_name || "Work Order picture"}
                          title={picture.file_name || "Work Order picture"}
                          loading={index === 0 ? "eager" : "lazy"}
                          fetchPriority={index === 0 ? "high" : undefined}
                        />
                      ) : (
                        <div className="detail-attachment-unavailable" role="img" aria-label={`${picture.file_name || "Work Order picture"} preview unavailable`} />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {pictures.length > 3 && (
              <div className="detail-attachment-toggle-wrapper">
                <button
                  className="detail-attachment-toggle"
                  type="button"
                  aria-expanded={showAllPictures}
                  onClick={() => setShowAllPictures((visible) => !visible)}
                >
                  <div className="detail-attachment-toggle-content">
                    <span>{showAllPictures ? "See fewer pictures" : `See all ${pictures.length} pictures`}</span>
                    <div className="detail-attachment-chevron">
                      <ChevronDown size={12} aria-hidden="true" />
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
        {files.length > 0 ? (
          <div className="attachment-row">
            <Paperclip size={15} aria-hidden="true" />
            <span>{files.map((file) => file.file_name).filter(Boolean).join(", ")}</span>
          </div>
        ) : pictures.length === 0 ? (
          <div className="attachment-row">
            <Paperclip size={15} aria-hidden="true" /> No attachments yet
          </div>
        ) : null}
      </div>
    </>
  );
}

function formatEstimatedTime(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "Not available";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return [hours ? `${hours}h` : "", remainingMinutes ? `${remainingMinutes}m` : ""]
    .filter(Boolean)
    .join(" ");
}

function DetailMetadata({ icon: Icon, children }) {
  return <div className="detail-metadata-item">{Icon && <Icon size={16} aria-hidden="true" />}<span>{children}</span></div>;
}

export function WorkOrderDetail({
  selected,
  isLoadingRecord = false,
  missingRecord,
  onEdit,
  onCopy,
  onPreparePdfExport,
  onStatusChange,
  onToggleRead,
  isSavingReadState = false,
  grants,
  userId,
  teamIds = [],
  assigneeOptions = [],
  memberDirectory = [],
  dateFormat,
  timezone,
  onLoadActivity,
  onPostComment,
  onUpdateComment,
  onDeleteComment,
  canDeleteAnyComments = false,
  onResolveWorkOrderLinks,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isDetailScrolled, setIsDetailScrolled] = useState(false);
  const [linkCopyStatus, setLinkCopyStatus] = useState("");
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const [pdfExportNotice, setPdfExportNotice] = useState("");
  const menuRef = useRef(null);
  const moreActionsButtonRef = useRef(null);
  const commentsRef = useRef(null);
  const pdfExportTimerRef = useRef(null);
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
  const closePdfExportDialog = useCallback(() => setIsPdfExportOpen(false), []);
  const handlePdfExportComplete = useCallback((filename) => {
    setPdfExportNotice(`PDF download started: ${filename}`);
    window.clearTimeout(pdfExportTimerRef.current);
    pdfExportTimerRef.current = window.setTimeout(() => setPdfExportNotice(""), 7000);
  }, []);
  useEffect(() => () => window.clearTimeout(pdfExportTimerRef.current), []);
  if (isLoadingRecord)
    return (
      <section className="detail-pane" aria-busy="true">
        <div className="detail-record-loading" role="status">
          <span className="detail-record-loading-spinner" aria-hidden="true" />
          <span>Loading Work Order...</span>
        </div>
      </section>
    );
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
  const canCreateWorkOrder = hasPermission(grants, "work_orders.create");
  const canChangeStatus = canAccessRecord(
    grants,
    "work_orders.change_status",
    record,
  );
  const canViewComments = canAccessRecord(
    grants,
    "work_orders.view_comments",
    record,
  );
  const canPostComments = canAccessRecord(
    grants,
    "work_orders.post_comments",
    record,
  );
  const canUseComments = canViewComments || canPostComments;
  const canUseMoreActions = canEditDetails || canChangeStatus || canUseComments || onToggleRead || canCreateWorkOrder;
  const assigneeOptionsByValue = new Map(assigneeOptions.map((option) => [option.value, option]));
  const identitiesById = new Map(memberDirectory.map((member) => [member.id, member]));
  const assignmentTargets = (selected.work_order_assignments ?? [])
    .map((assignment) => assignment.user_id
      ? { type: "user", id: assignment.user_id }
      : assignment.team_id ? { type: "team", id: assignment.team_id } : null)
    .filter(Boolean);
  if (!assignmentTargets.length && selected.assigned_to) {
    assignmentTargets.push({ type: "user", id: selected.assigned_to });
  }
  if (!assignmentTargets.length && selected.team_id) {
    assignmentTargets.push({ type: "team", id: selected.team_id });
  }
  const assignedNames = assignmentTargets.map((target) => {
    const identity = target.type === "user" ? identitiesById.get(target.id) : null;
    const option = assigneeOptionsByValue.get(`${target.type}:${target.id}`);
    return identity?.name ?? option?.label ?? (target.type === "user" ? "Assigned user" : "Assigned team");
  });
  const handleStatusChange = async (status) => {
    if (!canChangeStatus || isChangingStatus || status === selected.status || !onStatusChange) return;
    setIsChangingStatus(true);
    try {
      await onStatusChange(selected, status);
    } catch {
      // The Work Orders page owns and displays mutation errors.
    } finally {
      setIsChangingStatus(false);
    }
  };
  const showMarkDoneAction = isDetailScrolled && canChangeStatus && selected.status !== "Completed";
  const copyWorkOrderLink = async () => {
    const workOrderUrl = new URL(getRecordPath("workorders", selected.id), window.location.origin).href;
    try {
      await navigator.clipboard.writeText(workOrderUrl);
      setLinkCopyStatus("copied");
    } catch {
      setLinkCopyStatus("error");
    }
  };
  const headerAction = showMarkDoneAction ? (
    <button
      className="detail-header-action detail-header-action-primary"
      type="button"
      disabled={isChangingStatus || !onStatusChange}
      onClick={() => { void handleStatusChange("Completed"); }}
    >
      <Check size={15} aria-hidden="true" /> Mark as Done
    </button>
  ) : canEditDetails ? (
    <button className="detail-header-action" type="button" onClick={onEdit} disabled={!onEdit}>
      <Pencil size={15} aria-hidden="true" /> Edit
    </button>
  ) : canChangeStatus && selected.status !== "Completed" ? (
    <button
      className="detail-header-action detail-header-action-primary"
      type="button"
      disabled={isChangingStatus || !onStatusChange}
      onClick={() => { void handleStatusChange("Completed"); }}
    >
      <Check size={15} aria-hidden="true" /> Mark as Done
    </button>
  ) : null;
  const requesterIdentity = selected.requester_id ? identitiesById.get(selected.requester_id) : null;
  const creatorIdentity = selected.created_by ? identitiesById.get(selected.created_by) : null;
  const requesterName = selected.requester_id
    ? requesterIdentity?.name ?? "Requester details unavailable"
    : "Not available";
  const creatorName = selected.created_by
    ? creatorIdentity?.name ?? "User details unavailable"
    : "Not available";
  const updaterName = selected.updated_by
    ? identitiesById.get(selected.updated_by)?.name ?? "User details unavailable"
    : "Not available";
  const hasPriority = Boolean(selected.priority && String(selected.priority).trim().toLowerCase() !== "none");
  return (
    <section className="detail-pane">
      <header className="detail-header">
        <div className="detail-heading">
          <div className="detail-title-row">
            <h2>{selected.title}</h2>
            <button
              className="icon-button"
              aria-label={linkCopyStatus === "copied" ? "Work Order link copied" : "Copy Work Order link"}
              title={linkCopyStatus === "copied" ? "Link copied" : "Copy Work Order link"}
              type="button"
              onClick={() => { void copyWorkOrderLink(); }}
            >
              <Link size={17} aria-hidden="true" />
            </button>
            {linkCopyStatus && <span className="detail-link-copy-feedback" role="status">{linkCopyStatus === "copied" ? "Work Order link copied." : "Unable to copy Work Order link."}</span>}
          </div>
          <div className="detail-meta">
            <CalendarDays size={14} /> Due by {selected.due}
          </div>
        </div>
        <div className="detail-actions">
          {canUseComments && (
            <button
              className="detail-header-action"
              type="button"
              onClick={() => commentsRef.current?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                block: "start",
              })}
            >
              <MessageCircle size={15} /> Comments
            </button>
          )}
          {headerAction}
          {canUseMoreActions && (
            <div className="work-order-review-menu" ref={menuRef}>
              <button ref={moreActionsButtonRef} type="button" className="icon-button" aria-label="More work order actions" aria-haspopup="menu" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)}>
                <EllipsisVertical size={17} />
              </button>
              {isMenuOpen && <div className="work-order-detail-menu" role="menu" aria-label="Work Order actions">
                <button type="button" role="menuitem" disabled={!canEditDetails || !onEdit} onClick={() => { onEdit?.(); setIsMenuOpen(false); }}>
                  <span>Edit</span>
                </button>
                <button type="button" role="menuitem" disabled={isSavingReadState || !onToggleRead} onClick={async () => { await onToggleRead(selected); setIsMenuOpen(false); }}>
                  <span>Mark as {selected.is_read ? "unread" : "read"}</span>
                </button>
                <button className={!canCreateWorkOrder || !onCopy ? "is-unavailable" : ""} type="button" role="menuitem" disabled={!canCreateWorkOrder || !onCopy} onClick={() => { onCopy?.(); setIsMenuOpen(false); }}>
                  <span>Copy to New Work Order</span>{(!canCreateWorkOrder || !onCopy) && <LockKeyhole size={14} aria-hidden="true" />}
                </button>
                <button type="button" role="menuitem" onClick={() => { setIsPdfExportOpen(true); setIsMenuOpen(false); }}>
                  <span>Export to PDF</span>
                </button>
                {[
                  ["Save as Work Order Template", "Work Order templates are not available yet."],
                  ["Email to Vendors", "Emailing vendors is not available yet."],
                  ["Cancel Work Order", "Cancelling Work Orders is not available yet."],
                  ["Delete", "Deleting Work Orders is not available yet."],
                ].map(([label, unavailableMessage]) => (
                  <button className="is-unavailable" type="button" role="menuitem" key={label} disabled title={unavailableMessage}>
                    <span>{label}</span><LockKeyhole size={14} aria-hidden="true" />
                  </button>
                ))}
              </div>}
            </div>
          )}
        </div>
      </header>
      <div className="detail-scroll" onScroll={(event) => setIsDetailScrolled(event.currentTarget.scrollTop > 120)}>
        <div className="detail-summary-row">
          <div className="detail-content-block">
            <div className="detail-status-title"><strong>Status</strong></div>
            <div className="detail-status-row">
              <div>
                <div className="detail-status-buttons" role="group" aria-label="Work Order status">
                {statusOptions.map(({ value, label, className, icon: Icon }) => (
                  <button
                      className={`detail-status-button${className ? ` ${className}` : ""}${selected.status === value ? " is-active" : ""}`}
                      type="button"
                      key={value}
                      aria-pressed={selected.status === value}
                      disabled={!canChangeStatus || !onStatusChange || isChangingStatus || selected.status === value}
                      onClick={() => { void handleStatusChange(value); }}
                    >
                      <Icon size={22} strokeWidth={2} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="detail-work-order-facts">
          <div className={`detail-facts-grid${hasPriority ? "" : " detail-facts-grid--without-priority"}`}>
            <div className="detail-fact">
              <div className="detail-section-header"><h2>Due Date</h2></div>
              <div className="detail-fact-value">{selected.due || "No due date"}</div>
            </div>
            {hasPriority && (
              <div className="detail-fact">
                <div className="detail-section-header"><h2>Priority</h2></div>
                <div className="detail-fact-value">
                  <PriorityBadge priority={selected.priority} />
                </div>
              </div>
            )}
            <div className="detail-fact">
              <div className="detail-section-header"><h2>Work Order ID</h2></div>
              <div className="detail-fact-value">{selected.work_order_number ? `#${selected.work_order_number}` : "Not available"}</div>
            </div>
            <div className="detail-fact">
              <div className="detail-section-header"><h2>Request ID</h2></div>
              <div className="detail-fact-value">{selected.request_id ? `#${selected.request_id}` : "Not available"}</div>
            </div>
          </div>
        </div>
        <div className="detail-assignee-section">
          <div className="detail-section-header"><h2>Assigned To</h2></div>
          <ul className="detail-assignee-list">
            {assignmentTargets.length > 0 ? assignmentTargets.map((target) => {
              const option = assigneeOptionsByValue.get(`${target.type}:${target.id}`);
              const identity = target.type === "user" ? identitiesById.get(target.id) : null;
              const name = identity?.name ?? option?.label ?? (target.type === "user" ? "Assigned user" : "Assigned team");
              const avatar = identity ? {
                src: identity.avatarUrl,
                firstName: identity.firstName,
                lastName: identity.lastName,
              } : option?.avatar ?? {};
              const href = target.type === "user" ? `/users/profile/${target.id}` : `/teams/${target.id}`;
              return (
                <li key={`${target.type}:${target.id}`}>
                  <a href={href} className="detail-assignee-link">
                    <Avatar className="detail-assignee-avatar" {...avatar} name={name} alt="" />
                    <span>{name}</span>
                  </a>
                </li>
              );
            }) : (
              <li>
                <span className="detail-assignee-link">
                  <Avatar className="detail-assignee-avatar avatar-blue" name="Unassigned" alt="" />
                  <span>Unassigned</span>
                </span>
              </li>
            )}
          </ul>
        </div>
        <WorkOrderDescription key={selected.id} order={selected} />
        <div className="detail-secondary-sections">
          <section className="detail-attributes-section" aria-label="Work Order details">
            <div className="detail-attributes-grid">
              <div className="detail-attribute">
                <div className="detail-section-header"><h2>Asset</h2></div>
                <DetailMetadata icon={Boxes}>{selected.asset && selected.asset !== "Not available" ? selected.asset : "Not available"}</DetailMetadata>
              </div>
              <div className="detail-attribute">
                <div className="detail-section-header"><h2>Location</h2></div>
                <DetailMetadata icon={MapPin}>{selected.location && selected.location !== "Not available" ? selected.location : "Not available"}</DetailMetadata>
              </div>
              <div className="detail-attribute">
                <div className="detail-section-header"><h2>Estimated Time</h2></div>
                <DetailMetadata>{formatEstimatedTime(selected.estimated_duration_minutes)}</DetailMetadata>
              </div>
              <div className="detail-attribute">
                <div className="detail-section-header"><h2>Work Type</h2></div>
                <DetailMetadata>{selected.workType || "Not available"}</DetailMetadata>
              </div>
            </div>
            <div className="detail-categories">
              <div className="detail-section-header"><h2>Categories</h2></div>
              <div className="detail-category-list">
                {selected.categories?.length
                  ? selected.categories.map((category) => <span className="detail-category-chip" key={category.id ?? category.name ?? category}>{category.name ?? category}</span>)
                  : <span className="detail-category-empty">No categories</span>}
              </div>
            </div>
          </section>
          <section className="detail-cost-section" aria-labelledby="detail-cost-title">
            <h2 id="detail-cost-title">Time &amp; Cost Tracking</h2>
            {["Parts", "Time", "Other Costs"].map((label) => (
              <div className="detail-cost-row" key={label}>
                <span>{label}</span>
                <button type="button" disabled title={`${label} tracking is not available yet.`}>
                  Add <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </section>
          {canUseComments && (
            <WorkOrderActivity
              key={selected.id}
              order={selected}
              sectionRef={commentsRef}
              memberDirectory={memberDirectory}
              assigneeOptions={assigneeOptions}
              currentUserId={userId}
              canDeleteAnyComments={canDeleteAnyComments}
              canViewComments={canViewComments}
              canPostComments={canPostComments}
              dateFormat={dateFormat}
              timezone={timezone}
              onLoadActivity={onLoadActivity}
              onPostComment={onPostComment}
              onUpdateComment={onUpdateComment}
              onDeleteComment={onDeleteComment}
              onResolveWorkOrderLinks={onResolveWorkOrderLinks}
            />
          )}
        </div>
      </div>
      {isPdfExportOpen && (
        <WorkOrderPdfExportDialog
          isOpen={isPdfExportOpen}
          onClose={closePdfExportDialog}
          onExportComplete={handlePdfExportComplete}
          returnFocusRef={moreActionsButtonRef}
          workOrder={selected}
          onPrepareWorkOrder={onPreparePdfExport}
          assignedTo={assignedNames}
          requesterName={requesterName}
          createdByName={creatorName}
          updatedByName={updaterName}
          exportedByName={identitiesById.get(userId)?.name ?? "Workbench user"}
          dateFormat={dateFormat}
          timezone={timezone}
        />
      )}
      {pdfExportNotice && createPortal(
        <div className="work-order-pdf-export-toast" role="status" aria-live="polite">
          <FileDown size={18} aria-hidden="true" />
          <span>{pdfExportNotice}</span>
          <button type="button" onClick={() => setPdfExportNotice("")} aria-label="Dismiss PDF notification"><X size={17} aria-hidden="true" /></button>
        </div>,
        document.body,
      )}
    </section>
  );
}
