# Decision 002: State management

## Context

The current product is a frontend prototype with local mock data, sidebar navigation, panel selection, search, tab state, and deep-linkable record routes.

## Decision

Use local React state for component interaction and browser History API navigation for active pages and selected records. Use clean paths such as `/workorders/WO-1048`, `/assets/AST-1001`, and `/parts/PART-2001`. Do not add a global state library until shared server state or cross-page workflows justify one.

## Alternatives considered

Redux, Zustand, and similar libraries were not needed for the current local interaction scope.

## Consequences

State stays close to the component that owns it. Active pages and selected records are deep-linkable through browser paths, while mock data remains centralized in `src/data/mockData.js`. Legacy hash URLs remain readable during the transition.
