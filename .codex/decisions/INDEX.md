# Decision Index

Decision records explain why significant Workbench architecture exists. Read only the records relevant to the change, and inspect current source because implementation is authoritative for present behavior.

| ID | Decision | Relevant areas |
|---|---|---|
| 001 | [Frontend platform and routing](001-frontend-platform-and-routing.md) | React, Vite, Lucide, React Router, lazy routes |
| 002 | [Client state and navigation](002-client-state-and-navigation.md) | React state/context, route-owned state |
| 003 | [Supabase service data access](003-supabase-service-data-access.md) | Browser client, services, persistence boundaries |
| 004 | [Signup organization provisioning](004-signup-organization-provisioning.md) | Auth signup, organization/member creation |
| 005 | [Organization roles and permissions](005-organization-roles-and-permissions.md) | Role catalog, membership grants, role administration |
| 006 | [Authorization and forward-only security](006-authorization-and-forward-only-security.md) | RLS, trusted functions, security migrations |
| 007 | [Passkey authentication](007-passkey-authentication.md) | Supabase Auth WebAuthn |
| 008 | [Work Order creation and persistence](008-work-order-creation-and-persistence.md) | Assignments, files, numbering, transaction boundary |
| 009 | [Work Order Inbox paging and review state](009-work-order-inbox-query-and-review-state.md) | Server counts/pages, unread state/order, user preferences |
| 010 | [Institutional memory architecture](010-institutional-memory-architecture.md) | AGENTS, Skills, Patterns, Decisions, knowledge promotion |
