# 011. External Work Order sharing

## Context

Workbench needs to share a single Work Order with an external contact without granting access to the authenticated workspace, organization navigation, or other Work Orders. The repository does not yet contain a persisted Vendor/contact model or an email-delivery boundary.

## Decision

- External sharing is organization-controlled and additionally requires the `work_orders.share_externally` permission.
- Each Work Order has at most one active share record. The bearer token is generated server-side and only its SHA-256 hash is persisted.
- Browser roles have no direct table privileges for external share records. Authenticated management and anonymous external access use narrow `SECURITY DEFINER` RPCs with an explicit `search_path`.
- Every external read or write rechecks organization status, the organization feature flag, token validity, expiration, and Work Order lifecycle. Closing, cancelling, skipping, or disabling the feature revokes access.
- External links resolve to a public route that renders a restricted Work Order experience without the internal application shell.
- External completion is a review request, not a status mutation. Workbench records the external name and timestamp, surfaces a dedicated internal activity event and detail notice, and leaves the internal status change to the organization.

## Alternatives considered

- Direct browser queries with RLS were rejected because an anonymous bearer link should not expose a general-purpose table surface.
- Requiring external contacts to create Workbench accounts was rejected for the first release because the agreed workflow is link-based access.
- Persisting plaintext bearer tokens was rejected because a database read should not reveal active external links.

## Consequences

- Link reset rotates the bearer token and invalidates the previous URL.
- Public comments and external completion are intentionally represented with nullable internal authors plus external name/email fields. Internal comment author names are hidden from external viewers by default and can be enabled by an organization administrator. Commenter name and email requirements are separate organization settings; name is required by default and email is optional by default.
- Attachment metadata can be shown safely, but signed-file downloads require a follow-up storage RPC.
- Vendor contact selection is persisted per shared link through authenticated RPCs. Automatic email delivery remains follow-up work until a trusted mail-sending boundary exists; the current UI supports copying the link for the selected contacts rather than pretending email was sent.

## Source areas

- `supabase/migrations/20261014100000_external_work_orders.sql`
- `supabase/migrations/20261014110000_external_work_order_contacts.sql`
- `supabase/migrations/20261014120000_fix_external_work_order_token_generation.sql`
- `supabase/migrations/20261014130000_fix_external_work_order_share_timestamp_trigger.sql`
- `supabase/migrations/20261014140000_fix_external_work_order_digest_search_path.sql`
- `supabase/migrations/20261014150000_harden_external_work_order_rpc_grants.sql`
- `supabase/migrations/20261014160000_surface_external_completion_requests.sql`
- `supabase/migrations/20261014170000_add_organization_localization_defaults.sql`
- `supabase/migrations/20261014180000_expose_organization_localization_to_external_work_orders.sql`
- `supabase/migrations/20261014190000_expose_work_order_number_to_external_work_orders.sql`
- `supabase/migrations/20261014200000_harden_external_work_order_access_defaults.sql`
- `supabase/migrations/20261014210000_configure_external_comment_author_names.sql`
- `supabase/migrations/20261014220000_require_external_commenter_email.sql`
- `supabase/migrations/20261014230000_repair_external_completion_permission_check.sql`
- `supabase/tests/external_work_orders.sql`
- `src/pages/ExternalWorkOrderPage.jsx`
- `src/pages/work-orders/ExternalWorkOrderShareDialog.jsx`
- `src/services/externalWorkOrderService.js`
