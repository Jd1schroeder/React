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

const baseUrl = env.VITE_SUPABASE_URL.trim().replace(/\/$/, '')
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
const organizationA = env.SUPABASE_TEST_ORGANIZATION_A_ID.trim()
const organizationB = env.SUPABASE_TEST_ORGANIZATION_B_ID.trim()

function headers(token, extra = {}) {
  return { apikey: publishableKey, Authorization: `Bearer ${token}`, ...extra }
}

async function request(path, token, options = {}) {
  const url = `${baseUrl}${path}`
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: headers(token, options.headers),
    })
  } catch (error) {
    const cause = error?.cause?.message ? ` Cause: ${error.cause.message}` : ''
    throw new Error(`Request failed for ${options.method || 'GET'} ${url}: ${error.message}.${cause}`)
  }
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
const teamWorkOrderId = env.SUPABASE_TEST_TEAM_WORK_ORDER_ID
const nonTeamWorkOrderId = env.SUPABASE_TEST_NON_TEAM_WORK_ORDER_ID

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

  if (teamWorkOrderId || nonTeamWorkOrderId) {
    if (!teamWorkOrderId || !nonTeamWorkOrderId) throw new Error('Both team and non-team Work Order fixture IDs are required for scope checks.')
    const teamMembership = await request(`/rest/v1/organization_team_members?select=team_id&user_id=eq.${(await (await fetch(`${baseUrl}/auth/v1/user`, { headers: headers(tokenA) })).json()).id}`, tokenA)
    if (!teamMembership.response.ok || !Array.isArray(teamMembership.body) || !teamMembership.body.length) throw new Error('Identity A needs an active team membership for team-scope verification.')
    const teamRead = await request(`/rest/v1/work_orders?select=id&id=eq.${teamWorkOrderId}&organization_id=eq.${organizationA}`, tokenA)
    if (!teamRead.response.ok || teamRead.body.length !== 1) throw new Error('Team member could not read the team-scoped Work Order.')
    const nonTeamRead = await request(`/rest/v1/work_orders?select=id&id=eq.${nonTeamWorkOrderId}&organization_id=eq.${organizationA}`, tokenA)
    if (!nonTeamRead.response.ok || nonTeamRead.body.length !== 0) throw new Error('Team-scoped role read a Work Order outside its team.')
    console.log('Work Order team-scope checks passed.')
  } else {
    console.log('Skipped optional Work Order team-scope fixture checks; set SUPABASE_TEST_TEAM_WORK_ORDER_ID and SUPABASE_TEST_NON_TEAM_WORK_ORDER_ID to enable them.')
  }

  console.log('Security boundary checks passed.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
