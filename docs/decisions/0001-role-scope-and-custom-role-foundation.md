# Role scope and custom-role foundation

## Context

Workbench needs organization-specific roles and future custom permissions. The existing membership record stores a legacy text role (`owner`, `admin`, or `member`), while platform administration must be able to span organizations.

## Decision

Organization roles are managed at `/settings/teammates/roles`. The initial built-in organization roles are Requester, Technician, Supervisor, and Organization Admin. Custom roles are organization-owned records. Superadmin is an application-level role and must not be assignable through organization membership.

The roles foundation introduces `organization_roles` and a nullable `organization_members.role_id` compatibility path. The legacy membership role remains in place until role assignment and permission enforcement are migrated. Permission assignments will be added through a normalized role-permission model after the permission catalog is defined.

Each module or feature owns a permission catalog. Permission grants may be action-only or scoped to own, assigned, team, or any records. Each organization membership has one effective role. Custom roles are created by copying a selected built-in baseline, rather than inheriting dynamically. Role deletion requires a reassignment workflow and transactional reassignment of affected users. Organization Administrators may manage billing; Superadmin remains platform-only and hidden from organization-facing interfaces.

For Work Orders, Technician authorization separates core record edits from execution updates: a technician may change status and procedure progress on assigned work orders, but may not edit core details on work orders they did not create.

The permission catalog follows the granular MaintainX-style action model: modules expose separate actions for viewing, creating, editing, deleting, execution, approval, fulfillment, comments, status transitions, and other feature-specific operations. Nested actions such as individual work-order part-status transitions are represented by separate stable permission keys. Workbench intentionally retains scoped grants (`own`, `assigned`, `team`, `any`) where record ownership matters; organization-wide actions use an allow/deny presentation and persist as `any`.

## Consequences

- Organization settings can manage custom roles without conflating them with platform administration.
- Existing organizations retain their current membership and owner-protection behavior during migration.
- The UI can establish role CRUD and navigation now without pretending that unimplemented permissions are enforced.
- Future permission checks must be enforced server-side through the organization role and permission model, not only through frontend visibility.
- MaintainX terminology is used as the reference taxonomy, but permission enforcement remains Workbench-owned and is not assumed merely because a catalog key exists.
- System role records and grants are seeded per organization; membership `role_id` is authoritative, while the legacy text role is synchronized only for compatibility. Custom-role deletion reassigns affected memberships through a security-definer database function before deleting the role.
- Work Orders use database-level authorization: core fields require the edit grant against the creator scope, while status and procedure progress are separate execution mutations evaluated against the assignee scope.
- Role definition and role-grant policies use `organization.edit_user_roles` through the shared permission helper; the legacy text-role admin helper is retained only for compatibility with older membership data.
