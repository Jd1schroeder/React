# Decision 004: Signup organization provisioning

## Context

New accounts need an organization and owner membership immediately, including when email confirmation means Supabase Auth does not return a browser session. The browser has no privileged key and must not create owner records through an elevated client write.

## Decision

Signup submits organization/owner metadata through Supabase Auth. A database trigger provisions the organization and owner membership transactionally. Forward migrations also seed required built-in organization roles before assigning the owner role; browser access remains protected by RLS.

## Alternatives considered

- Browser-side privileged organization writes: rejected because signup may have no authenticated session and the browser must not have service-role access.
- Multi-step client provisioning: rejected because partial organization/member state is possible.

## Consequences

- Provisioning behavior is owned by database migrations and runs as part of Auth user creation.
- Signup metadata and trigger validation must remain in sync.
- New role or membership invariants must be included in the transaction or a forward-only repair path.

## Canonical implementation

`src/services/authService.js`, `supabase/migrations/20260917000000_create_organizations.sql`, and `supabase/migrations/20260928130000_provision_system_roles_for_new_organizations.sql`.

## Related knowledge

- Skills: [API](../skills/api/SKILL.md), [Database](../skills/database/SKILL.md), [Security](../skills/security/SKILL.md)
- Pattern: [Organization administration pages](../patterns/frontend/organization-administration.md)
