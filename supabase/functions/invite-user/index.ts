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

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': allowedOrigin(origin),
        Vary: 'Origin',
      },
    })
  }
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin)

  const authorization = request.headers.get('authorization')
  if (!authorization) return response({ error: 'Authentication required' }, 401, origin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceRoleKey) return response({ error: 'Invite service is not configured' }, 503, origin)

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData.user) return response({ error: 'Authentication required' }, 401, origin)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return response({ error: 'Invalid request body' }, 400, origin)
  }

  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : ''
  const contactValue = typeof body.contactValue === 'string' ? body.contactValue.trim() : ''
  const contactType = body.contactType === 'email' ? 'email' : ''
  const roleId = typeof body.roleId === 'string' ? body.roleId : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const notifyInvites = body.notifyInvites !== false

  if (!organizationId || !contactValue || !roleId || !contactType) {
    return response({ error: 'Email invitations require an organization, email address, and role.' }, 400, origin)
  }

  const { data: canInvite, error: permissionError } = await callerClient.rpc('has_organization_permission', {
    target_organization_id: organizationId,
    target_permission_key: 'organization.invite_users',
    required_scope: 'any',
  })
  if (permissionError || !canInvite) return response({ error: 'You do not have permission to invite users.' }, 403, origin)

  const { data: role, error: roleError } = await callerClient
    .from('organization_roles')
    .select('id, organization_id, system_key')
    .eq('id', roleId)
    .eq('organization_id', organizationId)
    .single()
  if (roleError || !role) return response({ error: 'The selected role is invalid for this organization.' }, 400, origin)

  const appOrigin = origin && allowedOrigin(origin) !== 'null'
    ? origin
    : (Deno.env.get('WORKBENCH_APP_ORIGIN') ?? '')
  if (!appOrigin) return response({ error: 'Invite service origin is not configured' }, 503, origin)
  const redirectTo = `${appOrigin}/accept-invite`
  const inviteOptions = {
    data: { first_name: firstName || null, last_name: lastName || null },
    redirectTo,
  }
  const authResult = notifyInvites
    ? await adminClient.auth.admin.inviteUserByEmail(contactValue, inviteOptions)
    : await adminClient.auth.admin.generateLink({ type: 'invite', email: contactValue, options: inviteOptions })
  if (authResult.error || !authResult.data?.user) {
    const message = authResult.error?.message || 'Unable to provision the invited account.'
    const status = message.toLowerCase().includes('already') ? 409 : 400
    return response({ error: message }, status, origin)
  }

  const authData = authResult.data
  const invitedUser = authData.user
  const assignedRole = role.system_key === 'organization_admin' ? 'admin' : 'member'
  const { data: invitation, error: invitationError } = await adminClient
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      invited_user_id: invitedUser.id,
      contact_type: 'email',
      contact_value: contactValue,
      first_name: firstName || null,
      last_name: lastName || null,
      role: assignedRole,
      role_id: roleId,
      invited_by: userData.user.id,
    })
    .select('id, organization_id, invited_user_id, contact_type, contact_value, first_name, last_name, role, role_id, status, invited_at, expires_at')
    .single()

  if (invitationError || !invitation) {
    await adminClient.auth.admin.deleteUser(invitedUser.id)
    return response({ error: invitationError?.message || 'Unable to save the invitation.' }, 400, origin)
  }

  const { error: membershipError } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: invitedUser.id,
      role: assignedRole,
      role_id: roleId,
      status: 'invited',
      invited_by: userData.user.id,
      invited_at: invitation.invited_at,
    })

  if (membershipError) {
    await adminClient.from('organization_invitations').delete().eq('id', invitation.id)
    await adminClient.auth.admin.deleteUser(invitedUser.id)
    return response({ error: membershipError.message }, 400, origin)
  }

  const inviteLink = 'properties' in authData
    ? (authData as { properties?: { action_link?: string } }).properties?.action_link ?? ''
    : ''

  return response({
    ...invitation,
    inviteLink,
  }, 201, origin)
})
