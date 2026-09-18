# 004 — Provision the first organization from Supabase Auth signup

## Context

New accounts need an organization immediately, including when Supabase requires email confirmation and does not return a client session. The browser only has the publishable key and must not perform privileged organization writes.

## Decision

The signup service sends organization and owner metadata through `supabase.auth.signUp`. A `SECURITY DEFINER` database trigger on `auth.users` creates the organization and its owner membership transactionally. Row-level security allows authenticated members to read their organization and membership records.

## Consequences

- Signup works before an email-confirmation session exists.
- Organization provisioning is centralized in the database boundary rather than duplicated in the React UI.
- The migration must be applied in the Supabase project before signup can provision organizations.
- Additional organization mutations should use a service/API boundary and preserve the RLS rules.
