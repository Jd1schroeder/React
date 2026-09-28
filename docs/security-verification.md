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
  '20260923250000',
  '20260928120000',
  '20260928130000',
  '20260928140000'
)
order by version;
```

The result must contain all seven versions. The final five migrations are forward-only repairs or authorization extensions; do not edit or rerun earlier applied migrations.

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

Optional release-scope fixtures:

```text
SUPABASE_TEST_TEAM_WORK_ORDER_ID
SUPABASE_TEST_NON_TEAM_WORK_ORDER_ID
```

Then run:

```powershell
npm.cmd run check:security
```

On Windows, use the interactive helper to avoid copying credentials or email addresses into shell commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-security-check.ps1
```

On Windows, the helper enables Node's Windows system certificate store and clears any inherited `NODE_TLS_REJECT_UNAUTHORIZED` override. This keeps the live check encrypted and avoids false `self-signed certificate in certificate chain` failures caused by local certificate inspection. Do not solve this by permanently disabling TLS verification.

The check must deny cross-organization membership reads and inserts, cross-organization role assignment, self-role changes, and suspended-organization work-order reads. Work Order fixtures should also cover own, assigned, team-member, non-team-member, and any-scope access; the database must be the source of truth for each result.

The two Work Order fixture IDs are optional for the baseline check but should be supplied for release verification. Identity A must use a role with a team-scoped Work Order view grant, belong to the team assigned to `SUPABASE_TEST_TEAM_WORK_ORDER_ID`, and not belong to the team assigned to `SUPABASE_TEST_NON_TEAM_WORK_ORDER_ID`.

## Edge Function deployment

From the repository root, deploy the function and configure the exact browser origins:

```powershell
npx.cmd supabase functions deploy upload-avatar
npx.cmd supabase functions deploy invite-user
npx.cmd supabase secrets set WORKBENCH_ALLOWED_ORIGINS=http://localhost:5173
npx.cmd supabase secrets set WORKBENCH_APP_ORIGIN=http://localhost:5173
npx.cmd supabase functions list
```

Both functions must be `ACTIVE` with JWT verification enabled. After changing function code, deploy again. Verify that an approved image succeeds, an oversized file fails, a renamed non-image file fails content detection, an approved-origin `OPTIONS` request returns `204`, and unauthenticated requests return `401`. For `invite-user`, verify that an authorized email invitation creates an unconfirmed Auth user and an invited membership, while an unauthorized caller or cross-organization role ID is rejected.
