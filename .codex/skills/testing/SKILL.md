---
name: testing
description: Validate Workbench UI and architecture changes using the repository's available checks and future interaction tests.
---

# Testing Skill

The project currently has no test runner configured. The required baseline validation is:

```text
npm.cmd run verify
```

`verify` checks that `AGENTS.md` exists, confirms every sidebar destination is registered in `src/App.jsx`, then runs linting and the production build.

When adding a test runner, prioritize shared behavior: sidebar navigation, hash/deep-link navigation, panel search clearing, list selection, Work Orders tabs, and responsive layout states. Do not add tests that only snapshot implementation details.

Nested-route checks should cover both generic `PanelView` pages and custom Work Orders pages: valid parent routes with unknown child IDs must preserve the app shell and render the shared detail-pane 404 state.

## Supabase validation

On Windows, run `node scripts/check-supabase-rls.mjs --insecure`; the command prompts for a short-lived token after it starts and handles the local TLS diagnostic issue. Use the token only at the prompt, never commit it or place it in a `VITE_*` variable.
