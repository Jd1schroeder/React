# Decision 003: Supabase client and service data access

## Context

Workbench moved from centralized mock data to a browser client backed by Supabase for authentication, database, and private Storage. Page-level transport would couple rendering to database details and make authorization harder to audit.

## Decision

Use the browser-safe Supabase client in `src/lib/supabase.js`, configured only with the project URL and public publishable key. Keep feature queries and mutations in `src/services/`; enforce access in Supabase RLS and trusted database/Edge Function boundaries. Use mock data only for explicitly scaffolded or not-yet-persisted workflows.

## Alternatives considered

- Supabase calls directly in page/presentational components: rejected because transport and permission logic would be duplicated across UI.
- Browser service-role credentials: rejected because they grant privileged access to an untrusted client.
- Continue using mock data for persisted workflows: rejected because it diverges from live organization data and permissions.

## Consequences

- Vite receives only public browser configuration; service-role keys remain server-side.
- Services accept explicit organization/record context and return feature-shaped values; database RLS remains authoritative.
- Unimplemented scaffold workflows show explicit empty/loading/error states rather than fabricated records.

## Canonical implementation

`src/lib/supabase.js`, `src/services/workOrderService.js`, `src/services/organizationService.js`, and `src/services/workspaceService.js`.

## Related knowledge

- Skills: [API](../skills/api/SKILL.md), [Database](../skills/database/SKILL.md), [Security](../skills/security/SKILL.md)
- Patterns: [Supabase service boundary](../patterns/data-access/supabase-service-boundary.md), [Panel page and route](../patterns/frontend/panel-page-and-route.md)
