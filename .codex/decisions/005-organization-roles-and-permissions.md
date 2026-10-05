# Decision 005: Organization roles and permissions

## Context

Workbench needs granular organization-specific permissions while keeping platform administration separate. The original membership text role is retained for compatibility during migration.

## Decision

Organization roles are organization-owned records; each membership has one effective role. Built-in roles are Requester, Technician, Supervisor, and Organization Admin. Custom roles copy a selected built-in baseline at creation rather than inheriting it dynamically. Superadmin is platform-only and is never assigned through organization membership.

Feature-owned permission catalogs use stable granular keys. Record permissions may be scoped to own, assigned, team, or any; organization-wide actions use an action grant rather than a misleading record scope. Work Order core editing is distinct from assigned execution updates.

## Alternatives considered

- Reuse a global platform role for organization access: rejected because role scopes and authority differ.
- Store arbitrary labels or permission names in the client: rejected because grants need stable keys and server enforcement.
- Dynamically inherit the selected role template: rejected so a later baseline change does not silently mutate custom roles.

## Consequences

- `organization_members.role_id` is authoritative; legacy text roles remain only for compatibility.
- Permission definitions live in `src/services/permissionCatalog.js`; normalized grants are enforced by the database.
- Role deletion with members requires transactional reassignment before deletion.

## Canonical implementation

`src/services/permissionCatalog.js`, `src/services/organizationService.js`, and `supabase/migrations/20260923130000_create_organization_roles.sql` through the role-authorization migrations.

## Related knowledge

- Skills: [Domain](../skills/domain/SKILL.md), [Database](../skills/database/SKILL.md), [Security](../skills/security/SKILL.md), [UI](../skills/ui/SKILL.md)
- Patterns: [Organization administration pages](../patterns/frontend/organization-administration.md), [Permissioned feature boundary](../patterns/security/permissioned-feature-boundary.md)
