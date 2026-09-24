# Security verification runbook

The browser client is not a security boundary. Run both the migration-history query and the authenticated RLS checks after applying security migrations.

The standard repository verification also checks that `vercel.json` retains the required security headers:

```powershell
npm.cmd run check:security-config
```

After deploying Workbench, verify the actual response headers with:

```powershell
$env:SECURITY_HEADERS_URL = 'https://your-workbench-domain.example'
npm.cmd run check:security-headers
```

## Migration history

Run this in the Supabase SQL editor:

```sql
select version, name
from supabase_migrations.schema_migrations
where version in (
  '20260923220000',
  '20260923230000',
  '20260923240000',
  '20260923250000'
)
order by version;
```

The result must contain all four versions. The final two migrations are forward-only repairs; do not edit or rerun earlier applied migrations.

## Live two-organization checks

Use two short-lived authenticated test identities. Identity A must belong to organization A; identity B must belong to suspended organization B. Supply the public Supabase URL/key from `.env.local` and the test-only values through the process environment. Never commit access tokens or place them in `VITE_*` variables.

Required variables:

```text
SUPABASE_TEST_ACCESS_TOKEN
SUPABASE_TEST_SECOND_ACCESS_TOKEN
SUPABASE_TEST_ORGANIZATION_A_ID
SUPABASE_TEST_ORGANIZATION_B_ID
SUPABASE_TEST_ORGANIZATION_A_ALTERNATE_ROLE_ID
SUPABASE_TEST_ORGANIZATION_B_ROLE_ID
```

Then run:

```powershell
npm.cmd run check:security
```

The check must deny cross-organization membership reads and inserts, cross-organization role assignment, self-role changes, and suspended-organization work-order reads.

## Edge Function deployment

From the repository root, deploy the function and configure the exact browser origins:

```powershell
npx.cmd supabase functions deploy upload-avatar
npx.cmd supabase secrets set WORKBENCH_ALLOWED_ORIGINS=http://localhost:5173,https://app.getmaintainx.com
npx.cmd supabase functions list
```

The function must be `ACTIVE` with JWT verification enabled. After changing function code, deploy again. Verify that an approved image succeeds, an oversized file fails, a renamed non-image file fails content detection, an approved-origin `OPTIONS` request returns `204`, and an unauthenticated `POST` returns `401`.
