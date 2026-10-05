# Decision 001: Frontend platform and routing

## Context

Workbench is a browser-based React application with shared layouts, authenticated and public routes, and deep-linked record pages. Route growth and eager imports made a hand-managed router and single initial bundle increasingly costly.

## Decision

Use React with Vite and Lucide React. Use `react-router-dom` for route matching, navigation, redirects, parameters, and unknown routes. Keep page-name/path generation in `src/routes.js`, the lazy page registry and route declarations in `src/routes/routeConfig.jsx`, and route composition in `src/App.jsx`.

Use React Router's data router (`createBrowserRouter` / `RouterProvider`) so route transitions can be blocked while an edit is dirty. Keep the shared unsaved-change prompt above routed pages; page controls can defer local navigation through that same guard.

## Alternatives considered

- Keep custom History API routing: rejected because routing, redirects, record parameters, and browser history were becoming duplicated manual behavior.
- Eagerly import pages: rejected because every page would increase the initial bundle.
- Replace React/Vite: no demonstrated need justifies the migration and tooling cost.

## Consequences

- Route-level modules are lazy-loaded and rendered through the shared loading fallback.
- Existing public, authenticated, settings, record, and legacy redirect behavior must remain stable when adding routes.
- Unsaved Work Order edits block app navigation and browser-history transitions until canceled or explicitly discarded; browser refresh/close uses the browser-native warning.
- Register destinations in both the canonical path map and route registry; reuse one lazy wrapper for aliases to a module.

## Canonical implementation

`src/App.jsx`, `src/routes.js`, and `src/routes/routeConfig.jsx`.

## Related knowledge

- Skills: [Architecture](../skills/architecture/SKILL.md), [UI](../skills/ui/SKILL.md)
- Pattern: [Panel page and route](../patterns/frontend/panel-page-and-route.md)
