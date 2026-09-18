---
name: api
description: Add API-backed behavior to Maintainly when backend contracts become available.
---

# API Skill

Supabase is configured through `src/lib/supabase.js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Authentication calls belong in `src/services/authService.js`; do not place Supabase calls directly into presentational components. Signup metadata is consumed by the organization-provisioning trigger in `supabase/migrations/20260917000000_create_organizations.sql`.

When API work begins:

- document the request/response contract before wiring UI behavior;
- isolate transport code from page components;
- render explicit loading and empty states while a domain service is not yet available;
- define loading, empty, error, and retry states in the shared panel primitives.
