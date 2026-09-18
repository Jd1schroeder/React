---
name: database
description: Guide persistence changes for Maintainly when a backend database is introduced.
---

# Database Skill

The current frontend has no database schema or persistence layer. Mock records live in `src/data/mockData.js` and must not be treated as a database contract.

When persistence is introduced, document entities and ownership first. Keep database access behind a service or API boundary; frontend components should consume typed domain data rather than issue database queries.
