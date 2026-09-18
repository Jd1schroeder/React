---
name: architecture
description: Extend the Maintainly frontend architecture while preserving shared layout boundaries, data flow, and page reuse.
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

The current backend-backed workspace identity is loaded through `src/services/workspaceService.js`. Domain pages should follow the same service boundary and must not render local fixture records.

The current app uses React state plus browser History API navigation in `src/routes.js`. Record pages use clean paths such as `/workorders/WO-1048`, `/assets/AST-1001`, and `/parts/PART-2001`. Do not introduce a state-management library without a documented architectural decision.
