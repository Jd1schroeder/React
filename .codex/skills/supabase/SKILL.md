---
name: supabase
description: "Use when doing ANY task involving Supabase. Triggers: Supabase products (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues); client libraries and SSR integrations (supabase-js, @supabase/ssr) in Next.js, React, SvelteKit, Astro, Remix; auth issues (login, logout, sessions, JWT, cookies, getSession, getUser, getClaims, RLS); Supabase CLI or MCP server; schema changes, migrations, declarative schemas, security audits, Postgres extensions (pg_graphql, pg_cron, pg_vector); debugging and troubleshooting errors or unexpected behavior on Supabase projects (HTTP errors, Postgres errors, RLS surprises, permission denied, schema cache issues, timeouts, Edge Function crashes, Realtime drops, Storage failures) and reading or querying logs (Logs Explorer, ClickHouse)."
metadata:
  author: supabase
  version: "0.1.2"
---

# Supabase

## Core Principles

**1. Supabase changes frequently — verify against changelog and current docs before implementing.**
Do not rely on training data for Supabase features. Function signatures, config.toml settings, and API conventions change between versions.

First, fetch `https://supabase.com/changelog.md` (a lightweight summary index — not a heavy pull), scan for `breaking-change` tags relevant to your task, and follow the linked page for any that apply. Then look up the relevant topic using the documentation access methods below.

**2. Verify your work.**
After implementing any fix, run a test query to confirm the change works. A fix without verification is incomplete.

**3. Recover from errors, don't loop.**
If an approach fails after 2-3 attempts, stop and reconsider. Try a different method, check documentation, inspect the error more carefully, and review relevant logs when available. Supabase issues are not always solved by retrying the same command, and the answer is not always in the logs, but logs are often worth checking before proceeding.

**4. Exposing tables to the Data API:** Depending on the user's [Data API settings](https://supabase.com/dashboard/project/<ref>/integrations/data_api/settings), newly created tables may not be automatically exposed via the Data (REST) API. If this is the case, `anon` and `authenticated` roles will need to be explicitly granted access.

> Note that this is separate from RLS, which controls which _rows_ are visible once a table is accessible, not whether the table is accessible at all.

When a SQL-created table is unexpectedly inaccessible, check Data API settings and whether roles have explicit `GRANT` access. When granting public access, always enable RLS too. See the [Data API security guide](https://supabase.com/docs/guides/api/securing-your-api.md).

**5. RLS in exposed schemas.**
Enable RLS on every table in any exposed schema, including `public` by default. Create policies that match the actual access model.

**6. Security checklist.**
When working on auth, RLS, views, storage, or user data:

- Never use editable `user_metadata` claims for authorization. Use `raw_app_meta_data` / `app_metadata` instead.
- Deleting a user does not invalidate existing access tokens; revoke sessions or use short JWT expiry for sensitive applications.
- JWT claims may be stale until refresh.
- Never expose `service_role` or secret keys in public clients. Use publishable keys in browser code.
- Use scoped personal access tokens for Management API, CLI, and MCP access.
- Views bypass RLS by default; use `security_invoker = true` on Postgres 15+ or keep views unexposed.
- UPDATE requires a SELECT policy as well as UPDATE policies.
- Prefer `TO authenticated` / `TO anon` over deprecated `auth.role()` checks, and combine role checks with row ownership predicates.
- UPDATE policies need both `USING` and `WITH CHECK`.
- Do not add `SECURITY DEFINER` to work around permissions. If genuinely needed, keep the function in a non-exposed schema, validate `auth.uid()`, and run advisors.
- Storage upsert requires INSERT, SELECT, and UPDATE access.
- Pin Supabase package versions and commit lockfiles.

For other security concerns, fetch the [Supabase product security index](https://supabase.com/docs/guides/security/product-security.md).

## Supabase CLI

Always discover commands via `--help` — never guess:

```bash
supabase --help
supabase <group> --help
supabase <group> <command> --help
```

Check the installed version with `supabase --version`. Use MCP `execute_sql` or `psql` if the installed CLI lacks `db query`; use MCP `get_advisors` if it lacks `db advisors`. Use scoped `SUPABASE_ACCESS_TOKEN` in CI.

For imperative migrations, create files with `supabase migration new <name>`; never invent migration filenames. For declarative projects, edit `supabase/schemas/` and generate a migration.

## Supabase MCP Server

For setup, use the [MCP setup guide](https://supabase.com/docs/guides/getting-started/mcp). Check reachability at `https://mcp.supabase.com/mcp` (401 without a token is expected), then verify `.mcp.json`, authenticate with OAuth, and confirm scoped token permissions if needed.

## Supabase Documentation

Before implementing a feature, use documentation in this order:

1. MCP `search_docs`.
2. Supabase docs pages with `.md` appended.
3. Web search for Supabase-specific topics.

## Making and Committing Schema Changes

If `supabase/schemas/` exists or `config.toml` uses `schema_paths`, use declarative schemas. Otherwise use imperative migrations.

For imperative work, iterate with `execute_sql` or `supabase db query`; do not use `apply_migration` to change a local schema. Before committing, run advisors, review security, generate a clean migration with `supabase db pull <descriptive-name> --local --yes`, and verify with `supabase migration list --local`.

## Debugging

For Supabase errors, fetch the [Monitoring and Debugging guide](https://supabase.com/docs/guides/monitoring-and-debugging.md) before diagnosing or proposing a fix.

## Reference Guides

- **Skill Feedback** → [references/skill-feedback.md](references/skill-feedback.md)
  **MUST read when** the user reports that this skill gave incorrect guidance or is missing information.
