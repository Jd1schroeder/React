# Panel page and route

## Purpose

Add an authenticated page while preserving Workbench's shared shell, route semantics, lazy loading, and record-detail behavior.

## Use when

Creating a new page, adding a route or record route, or deciding between a simple split panel and a custom page composition.

## Pattern

1. Register the page name/path in `src/routes.js` and the lazy page component and route handling in `src/routes/routeConfig.jsx`. Reuse one lazy wrapper when several route names share a module.
2. Use `PanelView` for the established list/detail pattern. Use `PanelLayout` when the page needs custom body content but should retain the shared header, search/action area, subnavigation, and panel shell.
3. Put page orchestration in `src/pages`; move substantial feature regions into nearby subcomponents and styles. Keep shared shell and reusable controls in `src/components/layout` and `src/components/ui`.
4. Preserve the authenticated shell and shared detail-pane not-found state for unknown record IDs. Keep public routes and authenticated routes in their existing route boundaries.
5. Keep data transport out of presentational page/layout components; follow the [Supabase service boundary](../data-access/supabase-service-boundary.md) when persistence is involved.
6. Opt `PanelView` list headers in through `showListHeader` only after that page implements its list actions. `PanelViewSelector` defaults to Panel View plus a disabled Table View until table rendering exists; keep its trigger's neutral hover/focus treatment and keyboard-operable menu.

## Canonical implementations

- `src/routes/routeConfig.jsx`
- `src/components/layout/PanelLayout.jsx`
- `src/components/layout/PanelView.jsx`
- `src/pages/Assets.jsx`
- `src/pages/UsersPage.jsx`
- `src/components/layout/PanelViewSelector.jsx`

## Related knowledge

- Skills: [Architecture](../../skills/architecture/SKILL.md), [UI](../../skills/ui/SKILL.md)
- Decision: [001 — Frontend platform and routing](../../decisions/001-frontend-platform-and-routing.md)
