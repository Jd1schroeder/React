---
name: api
description: Add API-backed behavior to Workbench when backend contracts become available.
---

# API Skill

Supabase is configured through `src/lib/supabase.js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Authentication calls belong in `src/services/authService.js`; do not place Supabase calls directly into presentational components. Signup metadata is consumed by the organization-provisioning trigger in the latest profile/provisioning migration (`supabase/migrations/20260918080000_add_profile_phone.sql`).

For Vercel deployments, configure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as public Config variables for every required environment, then create a fresh deployment because Vite injects `VITE_*` values at build time. Do not store these browser-exposed values as immutable Secrets if the deployment workflow needs to update them. Never expose a Supabase service-role key in a `VITE_*` variable or in the browser.

The current workspace service returns the authenticated user together with `profile`, `preferences`, all active organizations, and the selected organization. Profile edits should update `profiles` through a service. Email changes use Supabase Auth; application phone contact data belongs in `profiles.phone` because an email-authenticated user is not automatically a verified phone-authenticated user.

Membership administration must use the organization membership service and rely on Supabase RLS for authorization. Membership state is lifecycle-based (`invited`, `active`, or `suspended`); clients must not treat a role check in the UI as sufficient authorization.

Invitation tokens must be stored as hashes and invitation email/SMS delivery must run in a trusted backend or Edge Function; never generate or persist service-role credentials in the browser. Audit events should be written through an authorized service and include the organization, actor, action, entity, and structured metadata.

Invitation acceptance is enforced by the `accept_organization_invitation` database function: it validates the hashed token, expiry, authenticated contact, and membership transition before marking the invitation accepted.

When an invite recipient is signed out, preserve the raw invitation token only in session storage while routing through login or email verification; never persist it in the database or logs. The acceptance page removes it after a successful RPC.

Explicit audit writes use the `record_audit_event` database function, which derives the actor from `auth.uid()` and checks organization-admin authorization. Organization, membership, and invitation mutation triggers record their own audit events atomically; client mutation services must not add duplicate audit calls. Do not insert arbitrary audit rows directly from browser code.

Avatar files must be uploaded through the `upload-avatar` Supabase Edge Function, which authenticates the caller, checks the file's detected content type and size, and writes to the private `avatars` Storage bucket using a user-scoped path. The bucket configuration and Storage RLS provide a second server-side enforcement layer. Organization-owned files should use a separate private bucket with organization-scoped paths and membership-backed Storage RLS. Use buckets for access or lifecycle boundaries rather than creating one bucket per organization. Persist storage paths in profiles or domain rows and generate short-lived signed URLs only when data is loaded for display; never store temporary browser blob URLs or expiring signed URLs.

The avatar upload function requires the deployment environment variable `WORKBENCH_ALLOWED_ORIGINS` to contain the exact Workbench origins that may call it. It must not use a service-role key in browser code; the function forwards the caller's access token so Storage RLS remains effective.

When API work begins:

- document the request/response contract before wiring UI behavior;
- isolate transport code from page components;
- render explicit loading and empty states while a domain service is not yet available;
- define loading, empty, error, and retry states in the shared panel primitives.

The invitation contract should resolve the allowed membership role for the current organization rather than accepting an arbitrary client-provided label. The invite flow should submit a stable role value and let the backend validate membership and permissions.

## Browser storage standard

- Use `localStorage` only for non-sensitive, durable UI context. The current approved key is `workbench.activeOrganizationId`; always revalidate it against the authenticated user's active memberships before using it.
- Use `sessionStorage` only for short-lived flow state. The current approved key is `workbench.pendingInviteToken`, which may bridge login or email verification and must be removed after invitation acceptance or cancellation.
- Never store access tokens, refresh tokens, passwords, authorization decisions, profile records, organization records, or signed URLs in application-managed browser storage. Supabase Auth owns its session persistence.
- Persist profile, preference, membership, invitation, and audit data in Supabase and reload it through services. Namespace any future browser keys under `workbench.` and document their owner, sensitivity, lifetime, and cleanup behavior before adding them.
