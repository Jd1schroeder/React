import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function allowedOrigin(origin: string | null) {
  const configuredOrigins = (Deno.env.get('WORKBENCH_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return origin && configuredOrigins.includes(origin) ? origin : 'null'
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

function validEmail(value: string) {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceRoleKey) return response({ error: 'Account service is not configured' }, 503, origin)

  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) return response({ error: 'Authentication required' }, 401, origin)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return response({ error: 'Invalid request body' }, 400, origin)
  }

  const action = body.action === 'get' || body.action === 'update' ? body.action : ''
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : ''
  const userId = typeof body.userId === 'string' ? body.userId : ''
  if (!action || !organizationId || !userId) return response({ error: 'Organization, user, and action are required.' }, 400, origin)

  const { data: canEdit, error: permissionError } = await callerClient.rpc('has_organization_permission', {
    target_organization_id: organizationId,
    target_permission_key: 'organization.edit_user_accounts',
    required_scope: 'any',
  })
  if (permissionError || !canEdit) return response({ error: 'You do not have permission to edit user accounts.' }, 403, origin)

  const { data: membership, error: membershipError } = await callerClient
    .from('organization_members')
    .select('user_id, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()
  if (membershipError) return response({ error: membershipError.message }, 400, origin)
  if (!membership) return response({ error: 'The user is not a member of this organization.' }, 404, origin)

  const { data: authResult, error: authError } = await adminClient.auth.admin.getUserById(userId)
  if (authError || !authResult.user) return response({ error: 'Unable to load the user account.' }, 404, origin)
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, first_name, last_name, phone, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) return response({ error: profileError.message }, 400, origin)

  if (action === 'get') {
    return response({
      firstName: profile?.first_name ?? '',
      lastName: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
      email: authResult.user.email ?? '',
    }, 200, origin)
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!firstName || !email || !validEmail(email)) return response({ error: 'First name and a valid email address are required.' }, 400, origin)

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, { email })
  if (authUpdateError) return response({ error: authUpdateError.message }, 400, origin)

  const { error: profileUpdateError } = await adminClient
    .from('profiles')
    .upsert({ id: userId, first_name: firstName, last_name: lastName || null, phone: phone || null }, { onConflict: 'id' })
  if (profileUpdateError) return response({ error: profileUpdateError.message }, 400, origin)

  if (membership.status === 'invited') {
    await adminClient
      .from('organization_invitations')
      .update({ contact_value: email, first_name: firstName, last_name: lastName || null })
      .eq('organization_id', organizationId)
      .eq('invited_user_id', userId)
      .eq('status', 'invited')
  }

  return response({ firstName, lastName, phone, email }, 200, origin)
})
