# Organization administration pages

## Purpose

Keep organization member, team, invitation, and role-management screens consistent while keeping organization roles distinct from platform administration.

## Use when

Changing `/users`, `/teams`, or Manage Teammates settings pages, including role assignment, invitation management, account actions, or permission presentation.

## Pattern

- Use the shared `PanelLayout` and reusable `DataTable`; keep row rendering/actions in shared people components rather than dense column definitions.
- Keep Users and Teams as sibling pages reached through the shared tabs. Manage Teammates users, teams, and roles are settings subpages, not sidebar destinations.
- Load and mutate membership, role, and invitation data through their services. Render explicit loading, empty, and error states; do not invent records or permission controls.
- Keep the Invite Users screen focused on creating invitations; invitation history/revocation belongs with member management. Search should be clearable and filter already-loaded rows when data exists.
- Treat organization roles as organization-scoped. Superadmin is platform-only and must not appear in membership role selectors or organization settings.
- Use the canonical permission catalog and replacement-role reassignment flow for role administration. Server authorization remains authoritative.
- Use `/users/profile/:userId` for member identity details and real profile data; unavailable activity, work-order history, permissions, or team data stays explicitly empty/disabled rather than mocked. The permission panel is an audit view of the complete catalog, not only the member's current grants.
- Keep shared member table cells/actions in `UserTableCells.jsx` and `UserRowActions.jsx`; do not encode row behavior inside large page column definitions.
- Persist profile localization preferences through the profile service and shared date-formatting utility, not browser-locale-specific page formatters.

## Canonical implementations

- `src/pages/UsersPage.jsx`, `src/pages/TeamsPage.jsx`
- `src/pages/settings/ManageTeammatesPage.jsx`, `RolesPage.jsx`, `InviteUsersPage.jsx`
- `src/components/people/UserTableCells.jsx`, `UserRowActions.jsx`
- `src/services/organizationService.js`, `invitationService.js`, `permissionCatalog.js`

## Related knowledge

- Skills: [UI](../../skills/ui/SKILL.md), [API](../../skills/api/SKILL.md), [Database](../../skills/database/SKILL.md), [Security](../../skills/security/SKILL.md)
- Decision: [005 — Organization roles and permissions](../../decisions/005-organization-roles-and-permissions.md)
