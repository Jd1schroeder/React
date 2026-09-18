---
name: api
description: Add API-backed behavior to Workbench when backend contracts become available.
---

# API Skill

Supabase is configured through `src/lib/supabase.js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Authentication calls belong in `src/services/authService.js`; do not place Supabase calls directly into presentational components. Signup metadata is consumed by the organization-provisioning trigger in `supabase/migrations/20260917000000_create_organizations.sql`.

For Vercel deployments, configure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as public Config variables for every required environment, then create a fresh deployment because Vite injects `VITE_*` values at build time. Do not store these browser-exposed values as immutable Secrets if the deployment workflow needs to update them. Never expose a Supabase service-role key in a `VITE_*` variable or in the browser.

When API work begins:

- document the request/response contract before wiring UI behavior;
- isolate transport code from page components;
- render explicit loading and empty states while a domain service is not yet available;
- define loading, empty, error, and retry states in the shared panel primitives.

The future invitation contract must resolve account types from the current organization rather than accepting an arbitrary client-provided label. The invite flow should load active organization account types, submit a stable account-type identifier, and let the backend validate membership and permissions.
