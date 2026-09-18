import fs from 'node:fs'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

if (process.argv.includes('--insecure')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  console.warn('TLS certificate verification is disabled for this diagnostic run only.')
}

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {}
  return Object.fromEntries(fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).filter((line) => !line.startsWith('#')).map((line) => {
    const separator = line.indexOf('=')
    return [line.slice(0, separator), line.slice(separator + 1)]
  }))
}

const env = { ...loadEnvFile('.env.local'), ...process.env }
const baseUrl = env.VITE_SUPABASE_URL
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
let accessToken = env.SUPABASE_TEST_ACCESS_TOKEN

if (!accessToken && input.isTTY) {
  const prompt = readline.createInterface({ input, output })
  accessToken = (await prompt.question('TOKEN> ')).trim()
  prompt.close()
}

if (!baseUrl || !publishableKey || !accessToken) {
  console.error('A short-lived authenticated Supabase access token is required.')
  process.exitCode = 1
} else {
  const headers = {
    apikey: publishableKey,
    Authorization: `Bearer ${accessToken}`,
  }

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...headers, ...options.headers } })
    const text = await response.text()
    let body = null
    try { body = text ? JSON.parse(text) : null } catch { body = text }
    if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path} returned ${response.status}: ${JSON.stringify(body)}`)
    return body
  }

  async function assertDenied(path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    })
    const text = await response.text()
    if (response.ok || ![401, 403].includes(response.status)) {
      throw new Error(`Expected RLS denial for ${path}, received ${response.status}: ${text}`)
    }
    console.log(`RLS denied direct write: ${path}`)
  }

  try {
    const userResponse = await fetch(`${baseUrl}/auth/v1/user`, { headers })
    if (!userResponse.ok) throw new Error(`Authenticated token rejected: ${userResponse.status} ${await userResponse.text()}`)
    const user = await userResponse.json()
    const [profile, preferences, memberships] = await Promise.all([
      request(`/rest/v1/profiles?select=id,phone,updated_by&id=eq.${user.id}`),
      request(`/rest/v1/user_preferences?select=user_id,language,date_format,time_format,week_start,timezone,updated_by&user_id=eq.${user.id}`),
      request(`/rest/v1/organization_members?select=organization_id,role,status,updated_by&user_id=eq.${user.id}`),
    ])

    if (profile.length > 1 || preferences.length > 1) throw new Error('Expected at most one profile and preference row for the authenticated user.')
    const allowedStatuses = new Set(['invited', 'active', 'suspended'])
    if (memberships.some((membership) => !allowedStatuses.has(membership.status))) throw new Error('Membership lifecycle contains an unknown status.')
    console.log(`Authenticated workspace checks passed for ${user.id}: ${memberships.length} membership(s).`)

    await assertDenied('/rest/v1/audit_events', {
      organization_id: '00000000-0000-0000-0000-000000000000',
      action: 'validation_probe',
      entity_type: 'validation_probe',
    })
  } catch (error) {
    console.error(error.cause?.code ? `${error.message} (${error.cause.code})` : error.message)
    process.exitCode = 1
  }
}
