---
name: testing
description: Validate Maintainly UI and architecture changes using the repository's available checks and future interaction tests.
---

# Testing Skill

The project currently has no test runner configured. The required baseline validation is:

```text
npm.cmd run verify
```

`verify` checks that `AGENTS.md` exists, confirms every sidebar destination is registered in `src/App.jsx`, then runs linting and the production build.

When adding a test runner, prioritize shared behavior: sidebar navigation, hash/deep-link navigation, panel search clearing, list selection, Work Orders tabs, and responsive layout states. Do not add tests that only snapshot implementation details.
