---
name: architecture
description: Extend the Workbench frontend architecture while preserving shared layout boundaries, data flow, and page reuse.
---

# Architecture Skill

Keep the application organized around these boundaries:

- `src/components/layout` contains application-wide layout and panel primitives.
- `src/components/layout/sidebarConfig.js` contains the static sidebar and account-settings navigation model; `Sidebar.jsx` owns rendering and interaction state.
- `src/components/ui` contains small reusable controls.
- `src/pages` contains route-level page composition and page-specific styles.
- Large route pages should keep orchestration in the page module and place feature regions in nearby subcomponents, such as `src/pages/work-orders/WorkOrderList.jsx` and `WorkOrderDetail.jsx`.
- The Teams / Users sidebar destination maps to the `/users` route; `/teams` is a separate sibling route reached through the shared Users/Teams tabs. Do not restore the old `/teams/users` page as the primary destination.
- Authentication controls and signup-only styling live under `src/pages/auth/` and `src/pages/Signup.css`; shared login layout remains in `AuthPage.jsx` and `Login.css`.
- Settings route composition stays in `src/pages/SettingsPage.jsx`; individual settings features live under `src/pages/settings/`, with shared navigation/layout in `SettingsLayout.jsx` and shared page metadata/data in `settingsConfig.js`.
- Teammate administration lives under `/settings/teammates/users`, `/settings/teammates/teams`, and `/settings/teammates/roles`; these are Manage Teammates subpages, not new sidebar destinations. The legacy `/settings/manage-teammates` URL redirects to the Users subpage. Organization roles and application-level Superadmin must remain separate scopes.
- `src/data` contains mock data and page configuration for workflows that are not yet persisted.
- `src/services` contains backend-facing service boundaries such as authentication and organization provisioning.
- `src/styles` contains global tokens and reset rules.

Prefer extending an existing primitive over adding a parallel implementation. Keep route definitions in `src/routes/routeConfig.jsx` and reusable page configuration/data outside page components when multiple pages consume it.

Routing is implemented with `react-router-dom` in `src/App.jsx`, with the page registry and route definitions in `src/routes/routeConfig.jsx`; `src/routes.js` remains the canonical page-name-to-path map and URL builder. Preserve existing public, authenticated, settings, and record URLs when adding routes. Page modules are loaded with `React.lazy` so new route-level pages do not enlarge the initial bundle unnecessarily.
Define each lazy page wrapper once in `src/routes/routeConfig.jsx` and reuse it for every route name that points to the same module. This preserves one component identity and avoids duplicating lazy loader declarations for settings, scaffold, or shared placeholder pages.

The current backend-backed workspace identity is loaded through `src/services/workspaceService.js`. It returns all active organizations plus the selected organization; the selected ID is stored through the shared active-organization service helper. Domain pages should follow the same service boundary and must not render local fixture records.

Authenticated routes are coordinated by `src/components/layout/WorkspaceContext.jsx` and `WorkspaceProvider` in `AppLayout`. The provider waits for the Supabase session and workspace data before rendering the shell, refreshes on organization/profile/auth changes, and exposes the ready workspace through `useWorkspace`. Do not have individual layout or page components independently gate the authenticated shell or render anonymous-looking defaults while workspace hydration is pending.

The current app uses React state plus browser History API navigation in `src/routes.js`. Record pages use clean parent-child paths such as `/workorders/WO-1048`, `/assets/AST-1001`, and `/parts/PART-2001`; the same pattern applies to other registered sidebar destinations. Unknown child records preserve the parent page shell and use the shared panel-level not-found state. Do not introduce a state-management library without a documented architectural decision.
