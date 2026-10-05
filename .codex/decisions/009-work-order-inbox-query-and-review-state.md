# Decision 009: Work Order Inbox paging and review state

## Context

The Work Order Inbox can contain many records across independently expandable groups, while the sidebar unread badge spans the user's visible organization records. Loading all rows to calculate groups, apply sorting, or mark all read is costly and can expose records outside the current page's intended context.

## Decision

Fetch exact group counts separately and retrieve records through a server-filtered, server-sorted page RPC capped at 50 rows. Keep group membership, unread-first ordering, search, and sort in the database before offset pagination. Persist sort/unread-first preferences per user and organization. Keep review state per user and process “mark all read” as a set-based server action scoped to the current tab/search, not as a client loop over loaded rows.

The client loads pages on expansion, may prefetch only a group's first page on hover/focus, and deduplicates the request with expansion. It hydrates related metadata for returned IDs and signs private attachment paths after row metadata is available. The sidebar badge uses a separate visibility-limited aggregate across statuses.

## Alternatives considered

- Fetch every matching Work Order and paginate in the browser: rejected because memory, latency, and RLS-visible organization size are unbounded.
- Sort only the currently loaded page for unread-first: rejected because unread records on later pages would remain out of order.
- Mark only loaded rows read: rejected because it would leave unseen matching rows unread.
- Store Inbox sort in global user preferences: rejected because this preference is organization-specific.

## Consequences

- SQL RPCs must remain caller-authorized (`SECURITY INVOKER`) where row visibility is provided by Work Order RLS.
- Any query input that changes ordering or membership invalidates/reloads expanded pages and stale prefetch results.
- Counts, pages, badge count, review state, and preferences remain distinct server contracts.
- The UI uses exact counts and continuation controls, but never infers total matching records from loaded pages.

## Canonical implementation

`src/services/workOrderService.js`, `src/services/workOrderInboxPreferenceService.js`, `src/pages/work-orders/WorkOrderList.jsx`, and migrations `20261001160000_paginate_work_order_inbox.sql` through `20261001210000_add_work_order_inbox_preference_audit_actor.sql`.

## Related knowledge

- Skills: [API](../skills/api/SKILL.md), [Database](../skills/database/SKILL.md), [Domain](../skills/domain/SKILL.md), [UI](../skills/ui/SKILL.md), [Testing](../skills/testing/SKILL.md)
- Pattern: [Categorized remote inbox](../patterns/frontend/categorized-remote-inbox.md)
