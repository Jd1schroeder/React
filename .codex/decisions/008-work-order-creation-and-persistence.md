# Decision 008: Work Order creation and persistence

## Context

Work Order creation writes scalar fields, multiple direct-user/team assignments, and multiple private file attachments with one optional thumbnail. The parent and its related metadata must not be left partially created.

## Decision

Store assignments in `work_order_assignments`; keep legacy scalar assignment fields only as compatibility projections during migration. Store durable private Storage paths and attachment metadata in `work_order_attachments`; mark the selected thumbnail in metadata. Store duration as total minutes and keep local due date/time distinct from the timezone-synchronized compatibility timestamp. Defer recurrence persistence until its scheduling semantics are defined.

Create database records in one RPC transaction after uploading private objects. If the RPC fails, remove only the objects from that upload attempt best-effort. Keep the creation RPC narrowly `SECURITY DEFINER` with explicit caller, permission, assignment, organization/path, and object-existence validation.

## Alternatives considered

- Team ID arrays on profiles: rejected because team membership has a normalized organization-owned source of truth.
- Attachment URLs on Work Orders: rejected because URLs expire and a Work Order can have multiple typed files and a separately selected thumbnail.
- Separate hours/minutes columns: rejected in favor of one validated total-minutes value.
- Persist recurrence before schedule semantics exist: deferred to avoid prematurely constraining generation behavior.

## Consequences

- Authorization resolves assignment junctions and current team membership in database policies/functions.
- Persist paths, not blob previews or signed URLs; sign only for display.
- Validate new child fields/write paths inside the elevated RPC before expanding it.
- For edits, keep attachment reconciliation in the same database transaction as the parent Work Order update. The dedicated helper checks `work_orders.edit`, changes thumbnail state or metadata for only that Work Order, and returns removed object paths; Storage deletion follows the commit and is best-effort. Do not broaden direct attachment table update/delete policies to implement the image editor.

## Canonical implementation

`src/services/workOrderService.js:createWorkOrder` / `updateWorkOrderDetails`, `supabase/migrations/20261001120000_expand_work_order_creation.sql`, `20261001140000_harden_work_order_creation_rpc.sql`, and `20261005130000_reconcile_work_order_attachments_on_edit.sql`.

## Related knowledge

- Skills: [API](../skills/api/SKILL.md), [Database](../skills/database/SKILL.md), [Security](../skills/security/SKILL.md), [Domain](../skills/domain/SKILL.md)
- Pattern: [Secure attachment workflow](../patterns/data-access/secure-attachment-workflow.md)
