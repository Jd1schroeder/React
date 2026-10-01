---
name: api
description: Add API-backed behavior to Workbench when backend contracts become available.
---

# API Skill

Supabase is configured through `src/lib/supabase.js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Authentication calls belong in `src/services/authService.js`; do not place Supabase calls directly into presentational components. Signup metadata is consumed by the organization-provisioning trigger in the latest profile/provisioning migration (`supabase/migrations/20260918080000_add_profile_phone.sql`).

For Vercel deployments, configure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as public Config variables for every required environment, then create a fresh deployment because Vite injects `VITE_*` values at build time. Do not store these browser-exposed values as immutable Secrets if the deployment workflow needs to update them. Never expose a Supabase service-role key in a `VITE_*` variable or in the browser.

The current workspace service returns the authenticated user together with `profile`, `preferences`, all active organizations, and the selected organization. Profile edits should update `profiles` through a service. Email changes use Supabase Auth; application phone contact data belongs in `profiles.phone` because an email-authenticated user is not automatically a verified phone-authenticated user.

Linked-device sessions use `src/services/sessionService.js` and the `register-session` Edge Function plus `user_sessions` RPC boundary. Register the current Supabase session after workspace hydration, group rows by the durable non-sensitive `workbench.deviceId` browser key, capture IP metadata only server-side, keep device metadata user-scoped, and never query or expose `auth.sessions` from browser code.

Membership administration must use the organization membership service and rely on Supabase RLS for authorization. Membership state is lifecycle-based (`invited`, `active`, or `suspended`); clients must not treat a role check in the UI as sufficient authorization.

User-list views show pending invitations through `src/services/organizationService.js`. Email invitations provision an unconfirmed Auth user through the trusted `invite-user` Edge Function, so the pending membership has a real `user_id` and can expose its account/profile and role assignment before acceptance. Phone-only legacy invitations may still lack a `user_id`; keep account navigation and member-only actions unavailable for those rows.

Feature services should use `src/services/authorizationService.js` for fail-closed client preflight checks, but never treat those checks as a replacement for Supabase RLS. Work Order service methods require the current role grants and record context before issuing reads or mutations.

New Work Orders are created through `src/services/workOrderService.js`, not directly from the form. The service uploads images and files to the private `work-order-attachments` bucket under `{organization_id}/{uploader_id}/{work_order_id}/{attachment_id}.{ext}`, then calls `create_work_order_with_assignments` so the Work Order, assignment targets, and attachment metadata commit atomically. If the RPC fails, remove just-uploaded objects best-effort. Persist paths and generate short-lived signed URLs for display. The per-file limit is 10 MiB and is enforced by both bucket configuration and the database metadata constraint. Assignments are a list of `{ userId }` / `{ teamId }` targets; database RLS validates permission scope and organization membership. The due date is an ISO calendar date with optional `HH:mm` local time; estimated duration is total minutes or null.

Work Order Inbox reads use `listWorkOrderInboxCounts` and `listWorkOrderInboxPage` in `src/services/workOrderService.js`. Fetch exact group counts separately, request each expanded group in pages of 50 with filtering and sorting executed by the database, and hydrate assignment/read/attachment metadata only for returned rows. Render rows as soon as record and relation queries complete; generate signed attachment URLs afterward so Storage signing does not block the list. Keep record lookup by ID separate for deep links; do not restore an unbounded list query to populate the browser.

Work Order Inbox sort and `Unread first` preferences are persisted through `src/services/workOrderInboxPreferenceService.js` in `work_order_inbox_preferences`, scoped to the signed-in user and selected organization. Load saved preferences before enabling Inbox interaction, use defaults if none exist, and let RLS enforce active membership and ownership.

The Inbox `Unread first` option is passed to `get_work_order_inbox_page` and must order unread rows before read rows in SQL before offset/limit pagination; apply the selected date/priority sort as the secondary order. When a Work Order's read state changes while the option is active, reload expanded groups so subsequent pages remain correctly ordered. Do not sort only the currently loaded browser page, because unread records later in the result set would remain misplaced.

Work Order reviewed state is per user. `loadWorkOrderRelations` decorates fetched rows with the current user's `is_read` state; opening details marks one read, while detail-menu read/unread actions use `markWorkOrderRead` / `markWorkOrderUnread`. The Inbox MailCheck icon requires confirmation, then invokes `markWorkOrderInboxRead` with the active tab and search; the database processes the matching rows without loading them into the browser. Do not mark rows read merely because they were fetched or rendered in a list.

The sidebar Work Orders badge loads through `getUnreadWorkOrderCount` and the `get_unread_work_order_count` RPC. It covers all statuses in the selected organization, while RLS limits the aggregate to Work Orders the current user can view; mutations and Work Order creation invalidate the in-app badge count.

The creation RPC is `SECURITY DEFINER` only as a narrow workaround for an authenticated INSERT RLS failure; it must validate the caller's create permission, each assignment target, and each uploaded attachment's organization/uploader/Work Order path and object existence before writing. Keep direct table RLS restrictive.

The workspace service also loads the current user's team IDs for the selected organization. Pass team context to Work Order UI authorization only as a rendering aid; the Work Order service and RLS remain authoritative.

Invitation tokens must be stored as hashes and invitation email/SMS delivery must run in a trusted backend or Edge Function; never generate or persist service-role credentials in the browser. Audit events should be written through an authorized service and include the organization, actor, action, entity, and structured metadata.

Email invitation provisioning uses `supabase/functions/invite-user/index.ts`. The function verifies the caller's organization permission with the caller JWT, uses the Supabase secret only server-side, creates an unconfirmed Auth user, and creates the invited membership with its assigned `role_id`. Deploy it with `npx.cmd supabase functions deploy invite-user --use-api` when Docker is unavailable; confirm the function is `ACTIVE` with JWT verification enabled. Configure `WORKBENCH_ALLOWED_ORIGINS` and `WORKBENCH_APP_ORIGIN` from the actual Workbench origins. For local development, both may use `http://localhost:5173`; do not copy domains from reference products or screenshots.

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
Organization member account edits use the authenticated `manage-user-account` Edge Function. The function checks `organization.edit_user_accounts` through the caller JWT, validates organization membership, and performs Auth email changes with the service-role key only inside the function; browser code must use `src/services/userAccountService.js` and must never call the Auth admin API directly.

Passkey authentication uses the experimental Supabase Auth WebAuthn API through `src/services/authService.js`. The browser client must opt in with `auth.experimental.passkey`; registration belongs in authenticated Profile Preferences and sign-in belongs on the public login page. Passkeys require a stable configured WebAuthn relying-party ID and exact allowed origins in the Supabase project. Treat browser cancellation/timeouts as a neutral user notice rather than a registration failure.
