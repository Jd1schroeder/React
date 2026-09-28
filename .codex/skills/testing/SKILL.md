---
name: testing
description: Validate Workbench UI and architecture changes using the repository's available checks and future interaction tests.
---

# Testing Skill

The project uses Vitest for unit and UI behavior tests. The required baseline validation is:

```text
npm.cmd run verify
```

Vitest now covers shared authorization behavior and Work Order action visibility. Run `npm.cmd run test` for the unit/UI suite; keep live Supabase RLS checks in `npm.cmd run check:security` because they require short-lived test identities and organization IDs. On Windows, prefer `scripts/run-security-check.ps1`; it prompts for credentials without putting them in shell history and enables Node's Windows system certificate store for environments with trusted inspection certificates.

`verify` checks that `AGENTS.md` exists, confirms every destination in `src/components/layout/sidebarConfig.js` is registered in `src/routes/routeConfig.jsx`, then runs linting and the production build.

When adding a test runner, prioritize shared behavior: sidebar navigation, hash/deep-link navigation, panel search clearing, list selection, Work Orders tabs, and responsive layout states. Do not add tests that only snapshot implementation details.

Nested-route checks should cover both generic `PanelView` pages and custom Work Orders pages: valid parent routes with unknown child IDs must preserve the app shell and render the shared detail-pane 404 state.

## Supabase validation

On Windows, run `node scripts/check-supabase-rls.mjs --insecure`; the command prompts for a short-lived token after it starts and handles the local TLS diagnostic issue. Use the token only at the prompt, never commit it or place it in a `VITE_*` variable.
