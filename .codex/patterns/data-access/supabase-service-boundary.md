# Supabase service boundary

## Purpose

Keep Supabase transport and persistence logic out of presentational components, with client-side permission checks as preflight rather than the security boundary.

## Use when

Adding a Supabase read, mutation, RPC, Storage operation, or feature-level persistence service.

## Pattern

1. Put transport in a focused module under `src/services/` and use the configured client from `src/lib/supabase.js`.
2. Accept the organization/record context and permission grants needed by the operation; fail closed through `assertPermission` or the relevant authorization helper before issuing protected requests.
3. Return domain-shaped values and propagate errors to the page boundary. Presentational components own loading/empty/error UI, not query construction.
4. Scope organization queries explicitly and rely on RLS/RPC authorization for final access decisions. A client-side check only improves UX.
5. Prefer narrow RPCs for atomic or set-based operations; do not load whole tables into the client to simulate filtering, authorization, or aggregation.
6. Generate short-lived signed URLs only when files are displayed; persist durable object paths instead.

## Canonical implementations

- `src/lib/supabase.js`
- `src/services/workOrderService.js`
- `src/services/organizationService.js`
- `src/services/workspaceService.js`
- `src/services/authorizationService.js`

## Related knowledge

- Skills: [API](../../skills/api/SKILL.md), [Database](../../skills/database/SKILL.md), [Security](../../skills/security/SKILL.md)
- Decisions: [003 — Supabase client and service data access](../../decisions/003-supabase-service-data-access.md), [006 — Authorization and forward-only security](../../decisions/006-authorization-and-forward-only-security.md)
