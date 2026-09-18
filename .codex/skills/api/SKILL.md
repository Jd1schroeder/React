---
name: api
description: Add API-backed behavior to Workbench when backend contracts become available.
---

# API Skill

Supabase is configured through `src/lib/supabase.js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Authentication calls belong in `src/services/authService.js`; do not place Supabase calls directly into presentational components. Signup metadata is consumed by the organization-provisioning trigger in `supabase/migrations/20260917000000_create_organizations.sql`.

For Vercel deployments, configure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as public Config variables for every required environment, then create a fresh deployment because Vite injects `VITE_*` values at build time. Do not store these browser-exposed values as immutable Secrets if the deployment workflow needs to update them. Never expose a Supabase service-role key in a `VITE_*` variable or in the browser.

The current workspace service returns the authenticated user together with `profile`, `preferences`, all active organizations, and the selected organization. Profile edits should update `profiles` through a service, while email and phone changes should use the appropriate Supabase Auth update flow rather than writing authentication fields directly to a public table.

Membership administration must use the organization membership service and rely on Supabase RLS for authorization. Membership state is lifecycle-based (`invited`, `active`, or `suspended`); clients must not treat a role check in the UI as sufficient authorization.

Invitation tokens must be stored as hashes and invitation email/SMS delivery must run in a trusted backend or Edge Function; never generate or persist service-role credentials in the browser. Audit events should be written through an authorized service and include the organization, actor, action, entity, and structured metadata.

Invitation acceptance is enforced by the `accept_organization_invitation` database function: it validates the hashed token, expiry, authenticated contact, and membership transition before marking the invitation accepted.

Audit writes use the `record_audit_event` database function, which derives the actor from `auth.uid()` and checks organization-admin authorization. Do not insert arbitrary audit rows directly from browser code.

Avatar files must be uploaded through the `avatars` Storage bucket using a user-scoped path and RLS; profile records must not store temporary browser blob URLs.

When API work begins:

- document the request/response contract before wiring UI behavior;
- isolate transport code from page components;
- render explicit loading and empty states while a domain service is not yet available;
- define loading, empty, error, and retry states in the shared panel primitives.

The invitation contract should resolve the allowed membership role for the current organization rather than accepting an arbitrary client-provided label. The invite flow should submit a stable role value and let the backend validate membership and permissions.
