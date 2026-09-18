# Workbench

Workbench is a React operations dashboard for facility maintenance teams.

## Run locally

```bash
npm install
npm run dev
```

## Supabase signup setup

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`. Before using account creation, run
`supabase/migrations/20260917000000_create_organizations.sql` in the Supabase
SQL editor. The signup flow creates the Auth user, provisions an organization,
and adds the user as its owner. Email confirmation behavior is controlled by
the Supabase Auth settings. Add your local callback URLs to Supabase Auth's
Redirect URLs, including `http://localhost:5173/verify-email` and
`http://127.0.0.1:5173/verify-email`.

## Current scope

- Dashboard overview and team activity
- Work-order list with status filters
- Asset inventory
- Preventive-maintenance schedules
- Responsive application shell and reusable UI primitives

Supabase-backed signup, organization provisioning, and workspace identity are
implemented. Operations pages currently show empty states until their domain
tables and services are added; attachments and real-time updates can follow
the same service boundary.
