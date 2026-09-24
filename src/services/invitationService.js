import { supabase } from '../lib/supabase'

async function hashToken(token) {
  const bytes = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in to invite users.')
  return data.user.id
}

export async function listOrganizationInvitations(organizationId) {
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('id, organization_id, contact_type, contact_value, first_name, last_name, role, role_id, status, invited_by, invited_at, expires_at, accepted_by, accepted_at, created_at, updated_at, organization_roles(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createOrganizationInvitation({ organizationId, contactType, contactValue, firstName, lastName, role, roleId }) {
  const userId = await getUserId()
  const token = crypto.randomUUID()
  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      contact_type: contactType,
      contact_value: contactValue.trim(),
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
      role,
      role_id: roleId,
      invited_by: userId,
      token_hash: await hashToken(token),
    })
    .select('id, organization_id, contact_type, contact_value, first_name, last_name, role, role_id, status, invited_at, expires_at')
    .single()
  if (error) throw error
  return { ...data, inviteLink: `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}` }
}

export async function acceptOrganizationInvitation(token) {
  const { data, error } = await supabase.rpc('accept_organization_invitation', { raw_token: token })
  if (error) throw error
  return data
}

export async function revokeOrganizationInvitation(invitationId) {
  const { data, error } = await supabase
    .from('organization_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .select('id, organization_id, status, updated_at')
    .single()
  if (error) throw error
  return data
}
