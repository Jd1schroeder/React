---
name: database
description: Guide persistence changes for Workbench when a backend database is introduced.
---

# Database Skill

The Supabase schema is defined in timestamped migrations. `20260917000000_create_organizations.sql` creates `organizations` and `organization_members`; `20260918000000_create_user_profiles_and_preferences.sql` adds `profiles` and `user_preferences`, enables RLS, and provisions those records from new-user metadata. `organization_members.role` is the single membership-permission field (`owner`, `admin`, or `member`); do not create a parallel account-type field unless the product later requires a separate licensing concept. Operations pages must show empty states until their corresponding Supabase tables and services are implemented; do not reintroduce hardcoded record fixtures.

When persistence is introduced, document entities and ownership first. Keep database access behind a service or API boundary; frontend components should consume typed domain data rather than issue database queries. Never place a Supabase service-role key in the browser or in `VITE_` variables.

Personal identity and preferences belong to `profiles` and `user_preferences`, keyed by `auth.users.id`. Organization membership and permissions belong to `organization_members`; a user may have different membership roles in different organizations. Keep database access behind a service or API boundary, such as `src/services/workspaceService.js`, rather than issuing Supabase queries directly from page components.

Membership lifecycle is represented by `organization_members.status` (`invited`, `active`, or `suspended`), with `invited_by`, `invited_at`, `joined_at`, and `updated_at` tracking state changes. Owners and admins are the only membership administrators; enforce that boundary through the shared `is_organization_admin()` function and RLS policies rather than frontend checks alone.

Membership identity fields (`organization_id` and `user_id`) are immutable. The database must preserve at least one active owner per organization. Organization invitations and audit events are organization-owned tables and must be accessed through admin-authorized services. Profile visibility for member administration is granted through organization-admin RLS, while personal preference rows remain user-owned.

Invitation tokens are stored only as SHA-256 hashes. Acceptance must use the `accept_organization_invitation()` security-definer function so expiry, contact matching, membership creation, and invitation status changes happen atomically.

Audit event writes must use `record_audit_event()` for explicit events such as invitation acceptance, and the database mutation trigger must capture organization, membership, and invitation changes atomically. The database derives the actor and the browser may read audit events under RLS but must not supply arbitrary actor IDs.

Profiles own application contact data such as `phone`; the Supabase Auth provider remains responsible for authentication identity and provider metadata. Profile avatars use the private `avatars` Storage bucket, with object paths scoped under the authenticated user ID. Organization-owned files use a separate private bucket with organization-scoped paths such as `organizations/{organization_id}/{entity_type}/{entity_id}/...`. Use buckets for different access or lifecycle rules, not one bucket per tenant; Storage RLS must verify organization membership rather than trusting the path alone. Persist durable storage paths in database rows; create short-lived signed URLs only for display. Never persist temporary `blob:` preview URLs or expiring signed URLs.

Authentication metadata such as `auth.users.last_sign_in_at` must be exposed through a narrowly scoped `security definer` function with an organization-admin authorization check; never query `auth.users` directly from browser code.

Mutable organization, membership, profile, preference, and invitation rows carry `updated_at` plus nullable `updated_by`; the shared trigger derives the actor from `auth.uid()` when a user context exists. Use query-driven indexing rather than indexing every column. Primary keys and unique constraints already provide indexes. The `organization_members` composite primary key covers lookups beginning with `organization_id`; keep the separate `organization_members_user_id_idx` migration because workspace loading and future multi-organization views look up memberships by `user_id`. Add additional indexes only when an established filter, join, sort, or RLS policy justifies them; avoid speculative indexes on low-cardinality fields such as role or language.

`profiles.updated_at` and `user_preferences.updated_at` are maintained by the shared `public.set_updated_at()` trigger function. New mutable tables should use the same timestamp-trigger pattern when update history is part of the entity contract.
