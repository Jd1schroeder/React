---
name: security
description: Maintain Workbench authentication, authorization, storage, headers, and security verification boundaries.
---

# Workbench Security

Supabase RLS and database functions are the security boundary. Client route gates, hidden buttons, role labels, and `WorkspaceProvider` states are UX controls only and must never be the only authorization check.

The shared client evaluator lives in `src/services/authorizationService.js`. It supports `own`, `assigned`, `team`, and `any` record scopes and must fail closed for missing or invalid grants. Use it to hide unauthorized actions while keeping database RLS authoritative.

Linked-device session management must use the authenticated `register-session` Edge Function and `user_sessions` RPC boundary. The browser may register and list the signed-in user's sanitized device metadata, grouped by the non-sensitive `workbench.deviceId`, but it must not submit or access IP/session authority directly, query `auth.sessions`, or receive a service-role key. Session revocation functions must verify both `auth.uid()` and ownership of the target device's sessions.

Cross-device revocation must be reflected in the client through the authenticated `is_current_user_session_valid(uuid)` RPC. `WorkspaceProvider` checks it on visibility changes and a short interval; validation failures are ignored as transient errors, while a confirmed missing Auth session signs out the local client. Do not rely on cached access-token expiry alone for revoked-device UX.

For immediate cross-device UX, session-row insert/update/delete emits a generic private Supabase Realtime Broadcast on `user-session:<user_id>`. Clients use update events to refresh visible session lists and revalidate their own session after revoke events; broadcasts are notifications only and must not replace the server-side validity check.

For team scope, the client may use the authenticated user's loaded team IDs for responsive UI decisions, but Supabase must derive the final decision from `organization_team_members` and the Work Order's `team_id`. Never trust a caller-supplied `is_team_record` flag; the forward-only Work Order migration replaces that boolean path with membership-backed authorization.

Organization authorization must verify all of the following in the database:

- the caller has an active membership;
- the organization is active, unless the caller is a platform Superadmin using server-managed `auth.users.app_metadata.platform_role = 'superadmin'` for recovery operations;
- the membership `role_id` belongs to the same organization;
- invitation `role_id` values belong to the invitation organization;
- role-management and membership changes cannot let a user change their own role or bypass invitation acceptance.

Use forward-only timestamped migrations. Never edit or rerun an applied migration to repair security behavior; add a later corrective migration and include fail-closed assertions for existing cross-organization references.

Email invitation provisioning may create an unconfirmed Auth user, but only `supabase/functions/invite-user/index.ts` may use the Supabase secret key. The function must verify the caller's organization permission with the caller JWT and validate that the selected role belongs to the target organization before creating the pending membership. Deploy it with `npx.cmd supabase functions deploy invite-user --use-api` when Docker is unavailable, then verify it is `ACTIVE` with JWT verification enabled. Configure CORS using exact origins from the actual Workbench deployment; local development uses `http://localhost:5173`.

Organization administrators update another member's profile or Auth email only through `supabase/functions/manage-user-account/index.ts`, guarded by `organization.edit_user_accounts`. Never expose `auth.admin` or the service-role key to the browser, and do not treat client-side action visibility as authorization.

Passkey login uses WebAuthn platform credentials. Biometrics, device PINs, and security keys remain with the authenticator; Workbench receives only the signed WebAuthn result. Keep password login as a fallback, require confirmed non-anonymous users before registration, and keep the Supabase WebAuthn RP ID stable because changing it invalidates registered passkeys. Browser cancellation and ceremony timeouts are expected user outcomes and should not be rendered as technical security failures.

Avatar uploads must go through `supabase/functions/upload-avatar/index.ts`, which validates detected file content and size before writing to the private `avatars` bucket. Keep bucket limits, Storage RLS, user-scoped paths, and short-lived signed URLs enabled as defense in depth. Configure exact browser origins through `WORKBENCH_ALLOWED_ORIGINS`; deploy with `npx.cmd supabase functions deploy upload-avatar` and verify the function is `ACTIVE` with JWT verification enabled. CORS preflight handlers must return an empty 204 response body. Never expose a service-role key in the browser or Edge Function request body.

Production deployments must provide CSP, clickjacking protection, `nosniff`, referrer policy, and a restrictive permissions policy through the deployment configuration. Keep `script-src` free of `unsafe-eval`; document any unavoidable `unsafe-inline` use. Validate the checked-in policy with `npm.cmd run check:security-config`, then validate deployed response headers with `SECURITY_HEADERS_URL` and `npm.cmd run check:security-headers`.

Security changes must be verified with `npm.cmd run verify` plus the interactive Windows helper `powershell -ExecutionPolicy Bypass -File .\scripts\run-security-check.ps1`; follow `docs/security-verification.md` for the required migration-history and live two-organization checks. The helper uses Node's Windows system certificate store and removes any inherited `NODE_TLS_REJECT_UNAUTHORIZED` override so local certificate-inspection environments do not weaken the live check. Use separate short-lived authenticated test identities and organization/role IDs supplied through environment variables. Tests must prove that cross-organization role assignment, suspended-organization reads/writes, unauthorized membership creation, and unauthorized role changes are denied. Never commit those credentials or place them in `VITE_*` variables.
