# Permissioned feature boundary

## Purpose

Add a feature whose actions and records must be limited by organization role, record ownership, assignment, team membership, or platform scope.

## Use when

Designing a permission catalog entry, action visibility, service mutation, RLS policy, trigger, or privileged RPC.

## Pattern

- Define stable granular permissions in `src/services/permissionCatalog.js`; use own/assigned/team/any scopes only where record ownership matters.
- Use `authorizationService.js` to fail closed and hide unavailable UI actions. Treat this check as UX preflight only.
- Enforce the same permission and scope in database RLS, triggers, or a narrowly scoped RPC. Derive caller identity and team membership from trusted database state, never client booleans.
- Keep platform Superadmin authority separate from organization membership roles.
- Test both allowed and denied paths, including cross-organization and suspended-organization cases where relevant.

## Canonical implementations

- `src/services/permissionCatalog.js`
- `src/services/authorizationService.js`
- `supabase/migrations/20260923220000_harden_role_and_organization_authorization.sql`
- `supabase/migrations/20260923190000_create_work_orders_authorization.sql`

## Related knowledge

- Skills: [Security](../../skills/security/SKILL.md), [Database](../../skills/database/SKILL.md), [API](../../skills/api/SKILL.md), [Testing](../../skills/testing/SKILL.md)
- Decisions: [005 — Organization roles and permissions](../../decisions/005-organization-roles-and-permissions.md), [006 — Authorization and forward-only security](../../decisions/006-authorization-and-forward-only-security.md)
