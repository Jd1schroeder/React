import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function allowedOrigin(origin: string | null) {
  const origins = (Deno.env.get('WORKBENCH_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return origin && origins.includes(origin) ? origin : 'null'
}

function response(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': allowedOrigin(origin),
      Vary: 'Origin',
    },
  })
}

function getSessionId(authorization: string) {
  try {
    const encodedPayload = authorization.replace(/^Bearer\s+/i, '').split('.')[1]
    const payload = JSON.parse(atob(encodedPayload.replaceAll('-', '+').replaceAll('_', '/')))
    return typeof payload.session_id === 'string' ? payload.session_id : ''
  } catch {
    return ''
  }
}

function getIpAddress(request: Request) {
  const candidate = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? ''
  return /^[0-9a-fA-F:.]+$/.test(candidate) ? candidate : null
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': allowedOrigin(origin),
    Vary: 'Origin',
  } })
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin)

  const authorization = request.headers.get('authorization')
  if (!authorization) return response({ error: 'Authentication required' }, 401, origin)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return response({ error: 'Authentication required' }, 401, origin)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return response({ error: 'Invalid request body' }, 400, origin)
  }

  const sessionId = getSessionId(authorization)
  const requestedSessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : ''
  const deviceName = typeof body.deviceName === 'string' ? body.deviceName.trim() : ''
  const deviceType = typeof body.deviceType === 'string' ? body.deviceType : ''
  const browserName = typeof body.browserName === 'string' ? body.browserName.trim() : ''
  const operatingSystem = typeof body.operatingSystem === 'string' ? body.operatingSystem.trim() : ''

  if (!sessionId || requestedSessionId !== sessionId || !deviceId || !deviceName || !['browser', 'mobile', 'tablet', 'desktop'].includes(deviceType)) {
    return response({ error: 'Invalid session registration' }, 400, origin)
  }

  const { data, error } = await supabase.rpc('upsert_current_user_session', {
    target_session_id: sessionId,
    target_device_id: deviceId,
    target_device_name: deviceName,
    target_device_type: deviceType,
    target_browser_name: browserName,
    target_operating_system: operatingSystem,
    target_ip: getIpAddress(request),
    target_user_agent: request.headers.get('user-agent'),
  })
  if (error) return response({ error: error.message }, 400, origin)
  return response(data, 200, origin)
})
