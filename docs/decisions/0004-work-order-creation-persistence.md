# Work Order creation persistence

## Context

The create form collects several optional scalar fields, multiple assignment targets, multiple images/files, and one selected image thumbnail. Teams and team memberships already have normalized organization-owned tables. A work order may be assigned to a person and one or more teams; a person may also belong to an assigned team.

## Decision

- Store direct-user and team assignment targets in `work_order_assignments`; retain `work_orders.assigned_to` and `work_orders.team_id` as compatibility projections during the client transition. Do not put team ID arrays on user profiles.
- Store each image/file's durable Storage object path and metadata in `work_order_attachments`. Mark the selected thumbnail with `is_thumbnail`; keep binary data in one private bucket and create signed URLs only for display.
- Store nullable estimated duration as total minutes (`0h 0m` maps to `NULL`). Store due calendar date and optional local due time separately, synchronize the legacy `due_at` using the organization's timezone, and allow null priority.
- Defer recurrence persistence until its scheduling and generated-work-order semantics are designed.
- Create the Work Order, assignments, and attachment metadata in one database RPC transaction. Upload objects first and remove them best-effort if the transaction fails.
- Keep `create_work_order_with_assignments` as a narrow `SECURITY DEFINER` boundary after live authenticated INSERTs were denied despite matching RLS create grants. The function must re-check the caller's create permission and independently authorize assignment targets and uploaded attachment paths/objects; direct table policies remain restrictive.

## Alternatives considered

- Put team arrays on profile rows: rejected because membership already has a normalized source of truth and denormalization complicates authorization and team changes.
- Store attachment URLs or a single image URL on the work-order row: rejected because URLs expire, work orders may have multiple images/files, and thumbnail selection is attachment-specific.
- Store hours and minutes as separate fields: rejected because total minutes is easier to validate, query, and use for duration calculations.
- Implement recurrence in this slice: deferred so recurrence rules, completion-relative scheduling, and maintenance-plan behavior are not prematurely constrained.

## Consequences

Assignment-aware authorization must resolve junction rows and current team membership in RLS/functions. Existing scalar assignment fields remain until all readers/writers are migrated. Private-file access is metadata-backed; clients must never persist signed URLs. Date-only due values remain distinct from timed due values, and display/countdown logic must use the organization timezone.

The RPC's elevated execution means its explicit authorization checks are security-critical. Any future fields, child rows, or write paths added to the transaction must receive equivalent validation before the function is expanded.
