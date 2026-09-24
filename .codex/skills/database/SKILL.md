---
name: database
description: Guide persistence changes for Workbench when a backend database is introduced.
---

# Database Skill

The Supabase schema is defined in timestamped migrations. `20260917000000_create_organizations.sql` creates `organizations` and `organization_members`; `20260918000000_create_user_profiles_and_preferences.sql` adds `profiles` and `user_preferences`, enables RLS, and provisions those records from new-user metadata. The legacy `organization_members.role` field remains the compatibility source for `owner`, `admin`, and `member` while the roles foundation is introduced. `20260923130000_create_organization_roles.sql` adds organization-scoped custom role records and nullable `organization_members.role_id`; do not treat application-level Superadmin as an organization membership role. Operations pages must show empty states until their corresponding Supabase tables and services are implemented; do not reintroduce hardcoded record fixtures.

When persistence is introduced, document entities and ownership first. Keep database access behind a service or API boundary; frontend components should consume typed domain data rather than issue database queries. Never place a Supabase service-role key in the browser or in `VITE_` variables.

Personal identity and preferences belong to `profiles` and `user_preferences`, keyed by `auth.users.id`. Organization membership belongs to `organization_members`; organization role definitions belong to `organization_roles`, and future permission assignments must use a normalized role-permission boundary rather than embedding permission names in frontend code. A user may have different membership roles in different organizations. Keep database access behind a service or API boundary, such as `src/services/workspaceService.js`, rather than issuing Supabase queries directly from page components.

Permission definitions are feature-owned and should use stable keys, module/resource metadata, action, and an optional access scope. Recommended scopes are own, assigned, team, and any; use action-only grants for permissions such as billing or user administration. Role assignment is one role per organization membership. Role deletion must reassign affected memberships transactionally before the role is removed. Platform Superadmin authorization is separate from organization membership and must not be exposed through organization role rows.

The current persistence boundary is `organization_role_permissions` (migration `20260923140000_create_role_permissions.sql`) and the frontend service is `src/services/organizationService.js`. Permission keys and built-in baseline grants are defined in `src/services/permissionCatalog.js`; database rows should only persist selected catalog keys and valid scopes. MaintainX-style granular action keys are the reference taxonomy; organization-wide actions persist as `any` while the editor presents them as allow/deny.

System roles and their initial grants are seeded by `20260923150000_seed_system_organization_roles.sql`. Use `organization_members.role_id` as the authoritative assignment and keep the legacy text role only as a compatibility field. Shared database authorization begins with `has_organization_permission(...)`; role CRUD and custom-role deletion use `organization.edit_user_roles`, and `delete_custom_organization_role(...)` reassigns memberships and deletes the role in one transaction.

Work Order authorization is defined by `20260923190000_create_work_orders_authorization.sql`. The `work_orders_enforce_permissions` trigger permits Technician core edits only for records they created, while status and procedure-progress changes use assigned-record grants. Keep this distinction in database mutations, not only in UI button visibility.

Work Order authorization must distinguish core record editing from execution updates. Technician grants may allow status and procedure-progress changes on assigned work orders while restricting core edits to work orders created by that technician.

The role-management policy migration `20260923200000_authorize_role_management_by_permission.sql` keeps role definitions and role grants behind the granular role-management permission instead of the legacy text-role helper.

Deployments missing the original audit hardening migration can restore `record_audit_event(...)` through the forward-only repair migration `20260923210000_restore_record_audit_event.sql`; its access is governed by the organization reporting permission.

Membership lifecycle is represented by `organization_members.status` (`invited`, `active`, or `suspended`), with `invited_by`, `invited_at`, `joined_at`, and `updated_at` tracking state changes. Owners and admins are the only membership administrators; enforce that boundary through the shared `is_organization_admin()` function and RLS policies rather than frontend checks alone.

Membership identity fields (`organization_id` and `user_id`) are immutable. The database must preserve at least one active owner per organization. Organization invitations and audit events are organization-owned tables and must be accessed through admin-authorized services. Profile visibility for member administration is granted through organization-admin RLS, while personal preference rows remain user-owned.

Invitation tokens are stored only as SHA-256 hashes. Acceptance must use the `accept_organization_invitation()` security-definer function so expiry, contact matching, membership creation, and invitation status changes happen atomically.

Audit event writes must use `record_audit_event()` for explicit events such as invitation acceptance, and the database mutation trigger must capture organization, membership, and invitation changes atomically. The database derives the actor and the browser may read audit events under RLS but must not supply arbitrary actor IDs.

Profiles own application contact data such as `phone`; the Supabase Auth provider remains responsible for authentication identity and provider metadata. Profile avatars use the private `avatars` Storage bucket, with object paths scoped under the authenticated user ID. Organization-owned files use a separate private bucket with organization-scoped paths such as `organizations/{organization_id}/{entity_type}/{entity_id}/...`. Use buckets for different access or lifecycle rules, not one bucket per tenant; Storage RLS must verify organization membership rather than trusting the path alone. Persist durable storage paths in database rows; create short-lived signed URLs only for display. Never persist temporary `blob:` preview URLs or expiring signed URLs.

Authentication metadata such as `auth.users.last_sign_in_at` must be exposed through a narrowly scoped `security definer` function with an organization-admin authorization check; never query `auth.users` directly from browser code.

Mutable organization, membership, profile, preference, and invitation rows carry `updated_at` plus nullable `updated_by`; the shared trigger derives the actor from `auth.uid()` when a user context exists. Use query-driven indexing rather than indexing every column. Primary keys and unique constraints already provide indexes. The `organization_members` composite primary key covers lookups beginning with `organization_id`; keep the separate `organization_members_user_id_idx` migration because workspace loading and future multi-organization views look up memberships by `user_id`. Add additional indexes only when an established filter, join, sort, or RLS policy justifies them; avoid speculative indexes on low-cardinality fields such as role or language.

`profiles.updated_at` and `user_preferences.updated_at` are maintained by the shared `public.set_updated_at()` trigger function. New mutable tables should use the same timestamp-trigger pattern when update history is part of the entity contract.
