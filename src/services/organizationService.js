import { supabase } from '../lib/supabase'

export const membershipRoles = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Administrator' },
]

async function getUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in to manage organizations.')
  return data.user.id
}

export async function getUserOrganizations() {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, status, organizations(id, name, slug, description, logo_url, timezone, status)')
    .eq('user_id', userId)
    .eq('status', 'active')
  if (error) throw error
  return (data ?? []).map(({ organizations, ...membership }) => ({ ...organizations, ...membership }))
}

export async function listOrganizationMembers(organizationId) {
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('organization_id, user_id, role, status, invited_by, invited_at, joined_at, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
  if (membersError) throw membersError
  if (!members?.length) return []

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .in('id', members.map((member) => member.user_id))
  if (profilesError) throw profilesError

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return members.map((member) => ({ ...member, profile: profilesById.get(member.user_id) ?? null }))
}

export async function updateOrganizationMember({ organizationId, userId, role, status }) {
  const updates = {}
  if (role !== undefined) updates.role = role
  if (status !== undefined) updates.status = status
  if (status === 'active') updates.joined_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('organization_members')
    .update(updates)
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .select('organization_id, user_id, role, status, invited_by, invited_at, joined_at, updated_at')
    .single()
  if (error) throw error
  return data
}

export async function updateOrganization({ organizationId, updates }) {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', organizationId)
    .select('id, name, slug, description, logo_url, timezone, status, updated_at')
    .single()
  if (error) throw error
  return data
}
