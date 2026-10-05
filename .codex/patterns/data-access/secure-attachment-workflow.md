# Secure attachment workflow

## Purpose

Create a domain record with private file attachments without leaving orphaned objects or persisting expiring URLs.

## Use when

A create operation writes both database records and private Storage objects, especially when child rows reference uploaded files.

## Pattern

- Validate file type/size/name before upload and use a private bucket with entity-scoped durable paths.
- Upload objects, collect their durable paths and metadata, then call a narrow RPC that atomically validates and writes the parent, child relationships, and attachment metadata.
- If the database operation fails, best-effort remove only the objects uploaded by this request, then propagate the original failure.
- Keep RLS restrictive; any `SECURITY DEFINER` RPC must explicitly validate caller identity, permission, organization ownership, assignment targets, and object paths/existence.
- Create short-lived signed URLs for display after persistence. Never store blob URLs or signed URLs in database rows.

## Canonical implementation

`src/services/workOrderService.js:createWorkOrder`, `work_order_attachments`, and `create_work_order_with_assignments` in `supabase/migrations/20261001140000_harden_work_order_creation_rpc.sql`.

## Related knowledge

- Skills: [API](../../skills/api/SKILL.md), [Database](../../skills/database/SKILL.md), [Security](../../skills/security/SKILL.md)
- Decision: [008 — Work Order creation and persistence](../../decisions/008-work-order-creation-and-persistence.md)
