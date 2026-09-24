---
name: security
description: Maintain Workbench authentication, authorization, storage, headers, and security verification boundaries.
---

# Workbench Security

Supabase RLS and database functions are the security boundary. Client route gates, hidden buttons, role labels, and `WorkspaceProvider` states are UX controls only and must never be the only authorization check.

Organization authorization must verify all of the following in the database:

- the caller has an active membership;
- the organization is active, unless the caller is a platform Superadmin using server-managed `auth.users.app_metadata.platform_role = 'superadmin'` for recovery operations;
- the membership `role_id` belongs to the same organization;
- invitation `role_id` values belong to the invitation organization;
- role-management and membership changes cannot let a user change their own role or bypass invitation acceptance.

Use forward-only timestamped migrations. Never edit or rerun an applied migration to repair security behavior; add a later corrective migration and include fail-closed assertions for existing cross-organization references.

Avatar uploads must go through `supabase/functions/upload-avatar/index.ts`, which validates detected file content and size before writing to the private `avatars` bucket. Keep bucket limits, Storage RLS, user-scoped paths, and short-lived signed URLs enabled as defense in depth. Configure exact browser origins through `WORKBENCH_ALLOWED_ORIGINS`; deploy with `npx.cmd supabase functions deploy upload-avatar` and verify the function is `ACTIVE` with JWT verification enabled. CORS preflight handlers must return an empty 204 response body. Never expose a service-role key in the browser or Edge Function request body.

Production deployments must provide CSP, clickjacking protection, `nosniff`, referrer policy, and a restrictive permissions policy through the deployment configuration. Keep `script-src` free of `unsafe-eval`; document any unavoidable `unsafe-inline` use. Validate the checked-in policy with `npm.cmd run check:security-config`, then validate deployed response headers with `SECURITY_HEADERS_URL` and `npm.cmd run check:security-headers`.

Security changes must be verified with `npm.cmd run verify` plus `npm.cmd run check:security`; follow `docs/security-verification.md` for the required migration-history and live two-organization checks. Use separate short-lived authenticated test identities and organization/role IDs supplied through environment variables. Tests must prove that cross-organization role assignment, suspended-organization reads/writes, unauthorized membership creation, and unauthorized role changes are denied. Never commit those credentials or place them in `VITE_*` variables.
