# Security boundaries and forward-only hardening

## Context

Workbench is a browser client backed directly by Supabase. The browser can be modified by an end user, so route guards and UI permission checks cannot protect organization data. Earlier role migrations also left legacy policies and compatibility fields that required a coordinated hardening path.

## Decision

Keep authorization in Supabase RLS, triggers, and security-definer functions. Organization access requires an active membership in an active organization. Platform recovery is separate from organization roles and is recognized only through server-managed Auth app metadata. Applied security migrations are immutable; corrections use later migrations with assertions that fail closed when existing data violates organization boundaries.

Avatar uploads use a Supabase Edge Function for detected content and size validation, followed by private Storage RLS and short-lived signed URLs. Production security headers are configured at the deployment edge.

## Consequences

- New features must add server-side policies and regression checks before relying on UI visibility.
- A suspended organization cannot use normal organization APIs, while a platform operator can recover it without exposing a Superadmin role in organization settings.
- Security migrations must be applied in order and cannot be safely replaced by editing historical files.
- Avatar uploads require the Edge Function deployment and its allowed-origin configuration.
