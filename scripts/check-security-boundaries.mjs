import fs from 'node:fs'

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {}
  return Object.fromEntries(fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).filter((line) => !line.startsWith('#')).map((line) => {
    const separator = line.indexOf('=')
    return [line.slice(0, separator), line.slice(separator + 1)]
  }))
}

const env = { ...loadEnvFile('.env.local'), ...process.env }
const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_TEST_ACCESS_TOKEN',
  'SUPABASE_TEST_SECOND_ACCESS_TOKEN',
  'SUPABASE_TEST_ORGANIZATION_A_ID',
  'SUPABASE_TEST_ORGANIZATION_B_ID',
  'SUPABASE_TEST_ORGANIZATION_A_ALTERNATE_ROLE_ID',
  'SUPABASE_TEST_ORGANIZATION_B_ROLE_ID',
]

const missing = required.filter((key) => !env[key])
if (missing.length) {
  console.error(`Missing security test environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

const baseUrl = env.VITE_SUPABASE_URL
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
const organizationA = env.SUPABASE_TEST_ORGANIZATION_A_ID
const organizationB = env.SUPABASE_TEST_ORGANIZATION_B_ID

function headers(token, extra = {}) {
  return { apikey: publishableKey, Authorization: `Bearer ${token}`, ...extra }
}

async function request(path, token, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: headers(token, options.headers),
  })
  const text = await response.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  return { response, body }
}

function assertDenied(result, label) {
  if (![400, 401, 403].includes(result.response.status)) {
    throw new Error(`${label} was not denied: ${result.response.status} ${JSON.stringify(result.body)}`)
  }
  console.log(`Denied as expected: ${label}`)
}

const tokenA = env.SUPABASE_TEST_ACCESS_TOKEN
const tokenB = env.SUPABASE_TEST_SECOND_ACCESS_TOKEN

try {
  const ownA = await request(`/rest/v1/organization_members?select=organization_id&organization_id=eq.${organizationA}`, tokenA)
  if (!ownA.response.ok || !Array.isArray(ownA.body)) throw new Error('Test identity A cannot read its expected organization membership.')

  const crossRead = await request(`/rest/v1/organization_members?select=organization_id&organization_id=eq.${organizationB}`, tokenA)
  if (!crossRead.response.ok || crossRead.body.length !== 0) throw new Error('Identity A can read organization B membership data.')
  console.log('Denied as expected: cross-organization membership read')

  const crossInsert = await request('/rest/v1/organization_members', tokenA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ organization_id: organizationB, user_id: '00000000-0000-0000-0000-000000000000', role: 'member', role_id: env.SUPABASE_TEST_ORGANIZATION_B_ROLE_ID, status: 'active' }),
  })
  assertDenied(crossInsert, 'cross-organization membership insert')

  const crossRole = await request(`/rest/v1/organization_members?organization_id=eq.${organizationA}&role_id=not.is.null`, tokenA)
  if (!crossRole.response.ok || !Array.isArray(crossRole.body) || !crossRole.body[0]?.user_id) throw new Error('Identity A needs a membership row for the role-integrity check.')
  const roleMutation = await request(`/rest/v1/organization_members?organization_id=eq.${organizationA}&user_id=eq.${crossRole.body[0].user_id}`, tokenA, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ role_id: env.SUPABASE_TEST_ORGANIZATION_B_ROLE_ID, role: 'member' }),
  })
  assertDenied(roleMutation, 'cross-organization role assignment')

  const selfRoleMutation = await request(`/rest/v1/organization_members?organization_id=eq.${organizationA}&user_id=eq.${crossRole.body[0].user_id}`, tokenA, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ role_id: env.SUPABASE_TEST_ORGANIZATION_A_ALTERNATE_ROLE_ID, role: 'member' }),
  })
  assertDenied(selfRoleMutation, 'self role change')

  const suspendedRead = await request(`/rest/v1/work_orders?select=id&organization_id=eq.${organizationB}`, tokenB)
  if (!suspendedRead.response.ok || suspendedRead.body.length !== 0) throw new Error('Suspended organization returned work-order data.')
  console.log('Denied as expected: suspended organization work-order read')

  const userBResponse = await fetch(`${baseUrl}/auth/v1/user`, { headers: headers(tokenB) })
  const userB = await userBResponse.json()
  const suspendedWrite = await request('/rest/v1/work_orders', tokenB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ organization_id: organizationB, title: 'Security verification probe', created_by: userB.id }),
  })
  assertDenied(suspendedWrite, 'suspended organization work-order write')

  console.log('Security boundary checks passed.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
