# Decision 006: Authorization and forward-only security

## Context

Workbench is a browser client backed directly by Supabase and must assume that client code and UI visibility can be modified. Applied migrations have also required security repairs without losing the historical schema path.

## Decision

Supabase RLS, triggers, and narrowly scoped database/Edge Functions are the security boundary. UI checks are fail-closed preflight only. Applied migrations are immutable; security corrections use later timestamped migrations with assertions for invalid existing data. Platform recovery authority is separate from organization roles and comes only from server-managed Auth metadata.

## Alternatives considered

- Rely on hidden controls or route guards: rejected because a browser client is untrusted.
- Edit/replay an applied migration: rejected because deployed databases may already have applied it and would diverge.
- Broad `SECURITY DEFINER` functions or relaxed table policies: rejected because they widen authority beyond the operation that needs it.

## Consequences

- Add database enforcement and positive/negative authorization checks with each protected feature.
- Elevated functions must independently validate caller, organization, permissions, and referenced rows/objects.
- Security changes require both repository verification and the documented live RLS checks when credentials/test organizations are available.

## Canonical implementation

`src/services/authorizationService.js`, `supabase/migrations/20260923220000_harden_role_and_organization_authorization.sql`, and `docs/security-verification.md`.

## Related knowledge

- Skills: [Security](../skills/security/SKILL.md), [API](../skills/api/SKILL.md), [Database](../skills/database/SKILL.md), [Testing](../skills/testing/SKILL.md)
- Patterns: [Permissioned feature boundary](../patterns/security/permissioned-feature-boundary.md), [Supabase service boundary](../patterns/data-access/supabase-service-boundary.md)
