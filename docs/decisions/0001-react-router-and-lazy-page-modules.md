# Decision: React Router and lazy page modules

## Context

Workbench had a custom History API router in `src/routes.js`. It manually parsed paths, listened for `popstate` and `hashchange`, dispatched page names, and passed record IDs into pages. Every page was eagerly imported by `src/App.jsx`, which kept navigation logic simple but made route growth and bundle growth increasingly difficult to manage.

## Decision

Use `react-router-dom` for route matching, browser navigation, redirects, route parameters, and unknown-route handling. Keep route definitions and the lazy page registry in `src/routes/routeConfig.jsx`; keep `src/routes.js` as the canonical page-name-to-path and record-path mapping so sidebar labels and generated URLs remain stable.

Load route-level page modules with `React.lazy` and render them inside a shared `Suspense` fallback. Preserve the existing public paths, authenticated shell, settings paths, record paths, legacy hash redirects, and authenticated artwork fallback for unknown routes.

## Consequences

- Route behavior is represented declaratively in `src/routes/routeConfig.jsx` and composed by `src/App.jsx`.
- Browser back/forward behavior is provided by the router.
- Page modules are split into separate production chunks and loaded when needed.
- New routes must be added to the route map and route registry rather than adding manual History API parsing.
- The application now depends on `react-router-dom`.
