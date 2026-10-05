# Decision 002: Client state and navigation

## Context

Workbench has local interaction state, shared authenticated workspace state, server-backed data, and deep-linked record routes. A global state library would add another architecture without a demonstrated need.

## Decision

Use local React state for component/page interactions, React Context for authenticated workspace state, and React Router for URL/navigation state. Keep persisted server state behind feature services and do not add a global state-management library until a concrete cross-feature need justifies it.

## Alternatives considered

- Redux/Zustand or similar: deferred because current shared state is bounded by the workspace provider and route state belongs in the router.
- Hand-managed browser History API state: superseded by the router decision in [001](001-frontend-platform-and-routing.md).

## Consequences

- Keep state near its owner; use `WorkspaceProvider` for authenticated identity, selected organization, and shared workspace readiness.
- Put shareable/deep-linkable selected-record state in route parameters rather than parallel navigation state.
- Use services for persisted data; do not treat UI state as a replacement for backend persistence or authorization.

## Canonical implementation

`src/components/layout/WorkspaceContext.jsx`, `src/App.jsx`, and `src/routes/routeConfig.jsx`.

## Related knowledge

- Skills: [Architecture](../skills/architecture/SKILL.md), [UI](../skills/ui/SKILL.md)
- Patterns: [Panel page and route](../patterns/frontend/panel-page-and-route.md), [Application shell and settings](../patterns/frontend/application-shell-and-settings.md)
