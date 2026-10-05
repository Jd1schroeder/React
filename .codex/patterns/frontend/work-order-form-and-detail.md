# Work Order form and detail

## Purpose

Keep Work Order creation and record-detail surfaces consistent with the existing panel layout, shared controls, and service-owned persistence.

## Use when

Changing Work Order creation fields, form layout, attachment inputs, or the selected record's detail pane/actions.

## Pattern

- `NewWorkOrderForm` owns editable form state and emits a domain payload through `onCreate`; `WorkOrders.jsx` coordinates services and the panel layout. Do not add persistence calls to the form component.
- Reuse `NewWorkOrderForm` for edits with `mode="edit"` and `initialWorkOrder`; prefill only fields supported by persistence and send changes through `onUpdate`. Keep the page as the mutation coordinator and route header/menu Edit actions through record-scoped `work_orders.edit` authorization.
- In edit mode, compare the form against its initial persisted state and register whether changes are unsaved. Route navigation, browser history, selecting another Work Order, and leaving through Cancel must ask before discarding; preserve the form when the user cancels that prompt. Browser refresh/close should use the browser-native warning.
- “Copy to New Work Order” opens the create form with supported scalar fields and only assignment targets present in the caller's assignable options. Require `work_orders.create`; start with fresh status/read/activity state and do not silently duplicate private attachments or comments.
- For updates, send `assignments: null` when assignment targets are unchanged or the actor cannot assign. When targets change, authorize with `work_orders.assign` and replace assignment rows transactionally alongside legacy assignment projections.
- Keep existing private attachments inside their corresponding form controls during edits. The image dropzone should show persisted pictures with the selected thumbnail, allow removing pictures/changing the thumbnail/adding new uploads, and submit retained attachment IDs plus the selected thumbnail. Preserve current non-image files unless explicitly removed. Reconcile metadata atomically under `work_orders.edit`; on failure roll back only newly uploaded objects, and after commit best-effort delete only Storage objects for removed metadata. Storage upload/delete permissions must be scoped to the exact organization and Work Order.
- Keep the form header and footer fixed within the pane and put long-form fields in `.new-work-order-scroll`; preserve the existing responsive row/layout CSS in `src/pages/WorkOrders.css`.
- Use shared `DatePicker`, `Select`, `PresetNumberInput`, `ImageDropzone`, `Button`, and `Avatar` components where their contracts fit. Keep unavailable fields explicitly disabled rather than implying they persist.
- Attachments pass `File` objects and selected pictures to the service boundary. Preserve the configured per-file size validation and let the service own private upload, metadata, rollback, and atomic create behavior; see the secure attachment Pattern and Decision 008.
- Emit assignment targets as `{ userId }` or `{ teamId }`, dates as ISO calendar dates with optional local due time, and estimated duration as total minutes or `null`.
- Keep the Work Order detail pane record-scoped and permission-aware. Use `canAccessRecord` for action visibility, while service checks and Supabase RLS remain authoritative. Read/unread state is per-user; fetching or rendering the record does not itself mean it was read.
- Order the detail overview as a status-button row, four-field facts row (due date, priority, Work Order ID, Request ID), Assigned To list, then Description and its picture gallery. Route status clicks through the page's `onStatusChange` callback so the existing service permission checks and database authorization remain in force; show unavailable fields as “Not available” rather than inventing values.
- Keep description and pictures in separate sibling rows: description row → content block → heading wrapper/`h2` and description wrapper/`span`; picture row → gallery wrapper → `ul`/`li` thumbnails, followed by a “See all” control when more than three images exist. Keep non-image attachments outside the image list.
- Keep the detail header visible while `.detail-scroll` owns body scrolling. When a record can change status, the header’s Edit action transitions to “Mark as Done” after the content scrolls; route it through the same status callback and hide it for completed records. Header Comments should scroll to the comments region, respecting reduced-motion preferences.
- Keep the detail ellipsis menu's Mark as read/unread action functional. Show future actions in the reference order, but keep unsupported actions disabled, muted, and marked with a lock icon until their feature boundary is implemented; disabled menu actions must not look interactive.
- Keep the detail menu's PDF export client-side and record-scoped. Offer options only for data Workbench can export; keep unsupported sections disabled and locked rather than generating empty or invented content. Load the PDF generator on demand, use the selected record's signed attachment URLs for image pages, and apply the saved workspace date format/timezone to export metadata.
- Follow the overview with the available asset/location/estimated-time/work-type/category area, Time & Cost Tracking rows, and requester/creator/update metadata. Work Order records currently persist estimated duration, work type, requester/creator IDs, and update timestamps, but do not expose asset/location/category relations or comments/time-cost services in this detail query; render honest empty states and keep unsupported Add actions disabled instead of fabricating records or behavior.
- Keep creation/form field availability aligned with organization Work Order settings when that configuration exists; do not invent persisted behavior for scaffolded controls.

## Canonical implementation

`src/pages/work-orders/NewWorkOrderForm.jsx`, `src/pages/work-orders/WorkOrderDetail.jsx`, `src/pages/work-orders/WorkOrderPdfExportDialog.jsx`, `src/pages/WorkOrders.jsx`, `src/pages/WorkOrders.css`, `src/services/workOrderService.js`, and `src/services/workOrderPdfService.js`.

## Related knowledge

- Skills: [UI](../../skills/ui/SKILL.md), [Domain](../../skills/domain/SKILL.md), [API](../../skills/api/SKILL.md), [Security](../../skills/security/SKILL.md)
- Patterns: [Shared UI controls](shared-ui-controls.md), [Categorized remote inbox](categorized-remote-inbox.md), [Secure attachment workflow](../data-access/secure-attachment-workflow.md), [Permissioned feature boundary](../security/permissioned-feature-boundary.md)
- Decisions: [005 — Organization roles and permissions](../../decisions/005-organization-roles-and-permissions.md), [008 — Work Order creation and persistence](../../decisions/008-work-order-creation-and-persistence.md), [009 — Work Order Inbox paging and review state](../../decisions/009-work-order-inbox-query-and-review-state.md)
