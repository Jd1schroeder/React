---
name: database
description: Guide persistence changes for Maintainly when a backend database is introduced.
---

# Database Skill

The initial Supabase schema is defined in `supabase/migrations/20260917000000_create_organizations.sql`. It creates `organizations` and `organization_members`, enables RLS, and provisions an owner organization from new-user metadata. Operations pages must show empty states until their corresponding Supabase tables and services are implemented; do not reintroduce hardcoded record fixtures.

When persistence is introduced, document entities and ownership first. Keep database access behind a service or API boundary; frontend components should consume typed domain data rather than issue database queries. Never place a Supabase service-role key in the browser or in `VITE_` variables.
