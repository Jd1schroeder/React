# Work Order form and detail

## Purpose

Keep Work Order creation and record-detail surfaces consistent with the existing panel layout, shared controls, and service-owned persistence.

## Use when

Changing Work Order creation fields, form layout, attachment inputs, or the selected record's detail pane/actions.

## Pattern

- `NewWorkOrderForm` owns editable form state and emits a domain payload through `onCreate`; `WorkOrders.jsx` coordinates services and the panel layout. Do not add persistence calls to the form component.
- Keep the form header and footer fixed within the pane and put long-form fields in `.new-work-order-scroll`; preserve the existing responsive row/layout CSS in `src/pages/WorkOrders.css`.
- Use shared `DatePicker`, `Select`, `PresetNumberInput`, `ImageDropzone`, `Button`, and `Avatar` components where their contracts fit. Keep unavailable fields explicitly disabled rather than implying they persist.
- Attachments pass `File` objects and selected pictures to the service boundary. Preserve the configured per-file size validation and let the service own private upload, metadata, rollback, and atomic create behavior; see the secure attachment Pattern and Decision 008.
- Emit assignment targets as `{ userId }` or `{ teamId }`, dates as ISO calendar dates with optional local due time, and estimated duration as total minutes or `null`.
- Keep the Work Order detail pane record-scoped and permission-aware. Use `canAccessRecord` for action visibility, while service checks and Supabase RLS remain authoritative. Read/unread state is per-user; fetching or rendering the record does not itself mean it was read.
- Order the detail overview as a status-button row, four-field facts row (due date, priority, Work Order ID, Request ID), Assigned To list, then Description and its picture gallery. Route status clicks through the page's `onStatusChange` callback so the existing service permission checks and database authorization remain in force; show unavailable fields as “Not available” rather than inventing values.
- Keep description and pictures in separate sibling rows: description row → content block → heading wrapper/`h2` and description wrapper/`span`; picture row → gallery wrapper → `ul`/`li` thumbnails, followed by a “See all” control when more than three images exist. Keep non-image attachments outside the image list.
- Keep the detail header visible while `.detail-scroll` owns body scrolling. When a record can change status, the header’s Edit action transitions to “Mark as Done” after the content scrolls; route it through the same status callback and hide it for completed records. Header Comments should scroll to the comments region, respecting reduced-motion preferences.
- Keep the detail ellipsis menu’s Mark as read/unread action functional. Show future actions in the reference order, but keep unsupported actions disabled, muted, and marked with a lock icon until their feature boundary is implemented; disabled menu actions must not look interactive.
- Follow the overview with the available asset/location/estimated-time/work-type/category area, Time & Cost Tracking rows, and requester/creator/update metadata. Work Order records currently persist estimated duration, work type, requester/creator IDs, and update timestamps, but do not expose asset/location/category relations or comments/time-cost services in this detail query; render honest empty states and keep unsupported Add actions disabled instead of fabricating records or behavior.
- Keep creation/form field availability aligned with organization Work Order settings when that configuration exists; do not invent persisted behavior for scaffolded controls.

## Canonical implementation

`src/pages/work-orders/NewWorkOrderForm.jsx`, `src/pages/work-orders/WorkOrderDetail.jsx`, `src/pages/WorkOrders.jsx`, `src/pages/WorkOrders.css`, and `src/services/workOrderService.js`.

## Related knowledge

- Skills: [UI](../../skills/ui/SKILL.md), [Domain](../../skills/domain/SKILL.md), [API](../../skills/api/SKILL.md), [Security](../../skills/security/SKILL.md)
- Patterns: [Shared UI controls](shared-ui-controls.md), [Categorized remote inbox](categorized-remote-inbox.md), [Secure attachment workflow](../data-access/secure-attachment-workflow.md), [Permissioned feature boundary](../security/permissioned-feature-boundary.md)
- Decisions: [005 — Organization roles and permissions](../../decisions/005-organization-roles-and-permissions.md), [008 — Work Order creation and persistence](../../decisions/008-work-order-creation-and-persistence.md), [009 — Work Order Inbox paging and review state](../../decisions/009-work-order-inbox-query-and-review-state.md)
