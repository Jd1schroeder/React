---
name: architecture
description: Extend the Workbench frontend architecture while preserving shared layout boundaries, data flow, and page reuse.
---

# Architecture Skill

Keep the application organized around these boundaries:

- `src/components/layout` contains application-wide layout and panel primitives.
- `src/components/ui` contains small reusable controls.
- `src/pages` contains route-level page composition and page-specific styles.
- `src/data` contains mock data and page configuration for workflows that are not yet persisted.
- `src/services` contains backend-facing service boundaries such as authentication and organization provisioning.
- `src/styles` contains global tokens and reset rules.

Prefer extending an existing primitive over adding a parallel implementation. Keep navigation mappings in `src/App.jsx` and keep reusable page configuration/data outside page components when multiple pages consume it.

The current backend-backed workspace identity is loaded through `src/services/workspaceService.js`. It returns all active organizations plus the selected organization; the selected ID is stored through the shared active-organization service helper. Domain pages should follow the same service boundary and must not render local fixture records.

Authenticated routes are coordinated by `src/components/layout/WorkspaceContext.jsx` and `WorkspaceProvider` in `AppLayout`. The provider waits for the Supabase session and workspace data before rendering the shell, refreshes on organization/profile/auth changes, and exposes the ready workspace through `useWorkspace`. Do not have individual layout or page components independently gate the authenticated shell or render anonymous-looking defaults while workspace hydration is pending.

The current app uses React state plus browser History API navigation in `src/routes.js`. Record pages use clean parent-child paths such as `/workorders/WO-1048`, `/assets/AST-1001`, and `/parts/PART-2001`; the same pattern applies to other registered sidebar destinations. Unknown child records preserve the parent page shell and use the shared panel-level not-found state. Do not introduce a state-management library without a documented architectural decision.
