---
name: api
description: Add API-backed behavior to Maintainly when backend contracts become available.
---

# API Skill

Supabase is configured through `src/lib/supabase.js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The repository still has no endpoint definitions, authentication flow, or database contract. Do not invent endpoint shapes or place network calls directly into presentational components.

When API work begins:

- document the request/response contract before wiring UI behavior;
- isolate transport code from page components;
- preserve the existing mock-data path for local UI development where practical;
- define loading, empty, error, and retry states in the shared panel primitives.
