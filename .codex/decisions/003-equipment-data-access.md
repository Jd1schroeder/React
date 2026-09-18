# Decision 003: Equipment data access

## Context

The current repository is a frontend prototype and does not contain a backend, API client, or equipment database.

## Decision

Use centralized mock data for assets, work orders, preventive maintenance, and related records until a backend contract exists. Keep data access out of presentational layout components.

## Alternatives considered

Direct database access from the browser and invented API calls were rejected because no secure contract or authorization boundary exists yet.

## Consequences

UI work can proceed deterministically with local data. A future API integration must define contracts and move transport concerns behind a service boundary.
