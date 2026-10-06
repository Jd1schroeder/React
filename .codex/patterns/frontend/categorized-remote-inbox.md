# Categorized remote inbox

## Purpose

Render a large, filtered record inbox without downloading every row or blocking the initial panel on data the user may never open.

## Use when

Building a categorized, remotely paginated list with exact counts, expandable groups, sorting, or prefetch-on-intent.

## Pattern

- Load exact group counts separately from pages. Fetch rows from the server only when a group is expanded or its first page is prefetched.
- Keep group membership, filters, unread ordering, sort ordering, and pagination in the database query/RPC. Do not derive global order or counts from loaded browser pages.
- Prefetch only the first page for a non-empty group on hover or keyboard focus; deduplicate it with expansion and discard stale responses after query inputs change.
- Keep page metadata responsive: hydrate records/relations before signed image URLs, and reveal each page's thumbnails together after its URLs are ready. Show a skeleton only for an image that exists and is still loading.
- Preserve selected-record state across list clicks and route changes. Keep list-row actions separate from the row-selection interaction.
- Store durable account-level view preferences through a service and load them before enabling queries that depend on them. Persist expanded group IDs in browser `localStorage`, scoped by signed-in user, organization, and tab; keep search and the selected tab transient.
- Use a continuation control for the next page; do not fetch all remaining rows when a group opens.
- In the Work Orders Inbox, hide zero-count groups by default and offer “Show more” only while all visible groups are collapsed; an expanded group uses the same control for its next page. Preserve the list/options/sort/read-action hierarchy in `WorkOrderList.jsx`.
- Keep the two tab labels centered with empty leading/trailing spacers; do not add a dot. The active tab is disabled and has a blue bottom border.
- Keep all Work Order rows on the same 98px flex geometry with reserved selected-border space; selection changes its border/surface, not the row's layout. Preserve the link/thumbnail/content and title/requester/status row hierarchy. Unreviewed titles are semibold; reading is per-user and must not be inferred from fetch/render.
- Show the selected thumbnail (or first image) as a 48px rounded preview. Avoid blocking record rows on URL signing; preload each page's signed thumbnails together and use a reduced-motion-aware skeleton only while a known image is loading. In the detail gallery, request the first displayed picture eagerly at high fetch priority because the current performance trace identifies it as the LCP image; keep remaining pictures lazy.
- Keep status controls separate from row selection. Render their menus in a document-level portal and position them against the trigger and visible list viewport so sibling rows cannot cover or clip them.
- The sort control supports creation date, due date, last update, priority, and server-applied Unread first. Persist sort settings per user+organization; keep tab and search transient. Load the selected sort's menu section expanded and other sections collapsed.
- The MailCheck action confirms before marking the current tab/search read; after success show a dismissible toast. Keep its tooltip centered and outside the clipped inbox panel.
- Display organization-scoped Work Order numbers with `#`; retain UUIDs for routes and lookup. The sidebar unread count covers all visible statuses in the selected organization, not only the current tab/search.

## Canonical implementation

`src/pages/work-orders/WorkOrderList.jsx`, `src/pages/WorkOrders.jsx`, `src/services/workOrderService.js`, and the `get_work_order_inbox_counts` / `get_work_order_inbox_page` migrations.

## Related knowledge

- Skills: [UI](../../skills/ui/SKILL.md), [API](../../skills/api/SKILL.md), [Database](../../skills/database/SKILL.md), [Domain](../../skills/domain/SKILL.md), [Testing](../../skills/testing/SKILL.md)
- Decision: [009 — Work Order Inbox paging and review state](../../decisions/009-work-order-inbox-query-and-review-state.md)
