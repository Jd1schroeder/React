# Decision 004: Supabase client boundary

## Context

Maintainly needs a backend foundation for authentication, database persistence, file storage, and future realtime features. The current UI still uses centralized mock data and has no agreed database schema.

## Decision

Use the Supabase JavaScript client from `src/lib/supabase.js` for browser-safe client connectivity. Configure it with `VITE_SUPABASE_URL` and the public publishable key stored in `.env.local`. Keep mock data active until entities, ownership rules, and row-level security policies are defined.

## Alternatives considered

Direct REST calls from page components and exposing a service-role key were rejected because they would couple presentation code to transport details and bypass the security boundary.

## Consequences

Supabase can be introduced incrementally without replacing the current UI prototype. Future database access must be isolated in services, with organization scoping and RLS defined before replacing mock data.
