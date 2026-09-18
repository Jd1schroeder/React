# Decision 001: Frontend framework

## Context

Maintainly is a browser-based React application and needs reusable page layouts, sidebar navigation, and interactive panel views.

## Decision

Use React with Vite. Use Lucide React for the icon system.

## Alternatives considered

No alternative framework is currently required by the repository. A different framework would add migration and tooling cost without a demonstrated need.

## Consequences

Pages and reusable layout primitives remain React components. Vite remains the development and production build tool.
