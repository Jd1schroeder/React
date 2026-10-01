import { supabase } from '../lib/supabase'
import { listOrganizationInvitations } from './invitationService'
import { getBaselinePermissions, validatePermissionGrants } from './permissionCatalog'
export { organizationRoleCatalog } from './permissionCatalog'

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

export async function listOrganizationMembers(organizationId, { includePendingInvitations = false } = {}) {
  const [{ data: members, error: membersError }, invitations] = await Promise.all([
    supabase
      .from('organization_members')
      .select('organization_id, user_id, role, role_id, status, invited_by, invited_at, joined_at, created_at, updated_at, organization_roles(id, name, system_key, is_system)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true }),
    includePendingInvitations ? listOrganizationInvitations(organizationId) : Promise.resolve([]),
  ])
  if (membersError) throw membersError

  const memberRows = members ?? []
  let profiles = []
  if (memberRows.length) {
    const { data, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, avatar_url')
      .in('id', memberRows.map((member) => member.user_id))
    if (profilesError) throw profilesError
    profiles = data ?? []
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const invitationsByUserId = new Map((invitations ?? [])
    .filter((invitation) => invitation.status === 'invited' && invitation.invited_user_id)
    .map((invitation) => [invitation.invited_user_id, invitation]))
  const avatarPaths = [...new Set((profiles ?? [])
    .map((profile) => profile.avatar_url)
    .filter((avatarUrl) => avatarUrl && !avatarUrl.startsWith('http')))]
  const signedAvatarUrlsByPath = new Map()
  if (avatarPaths.length) {
    const { data: signedAvatars } = await supabase.storage
      .from('avatars')
      .createSignedUrls(avatarPaths, 60 * 60)
    for (const avatar of signedAvatars ?? []) {
      if (avatar.path && avatar.signedUrl) signedAvatarUrlsByPath.set(avatar.path, avatar.signedUrl)
    }
  }
  const { data: lastVisits, error: lastVisitsError } = memberRows.length
    ? await supabase.rpc('get_organization_member_last_visits', { target_organization_id: organizationId })
    : { data: [], error: null }
  const lastVisitsByUserId = new Map((lastVisitsError ? [] : lastVisits ?? []).map((visit) => [visit.user_id, visit.last_sign_in_at]))
  const hydratedMembers = memberRows.map((member) => ({
    ...member,
    ...(invitationsByUserId.get(member.user_id) ? {
      invitation_id: invitationsByUserId.get(member.user_id).id,
      contact_type: invitationsByUserId.get(member.user_id).contact_type,
      contact_value: invitationsByUserId.get(member.user_id).contact_value,
      email: invitationsByUserId.get(member.user_id).contact_type === 'email' ? invitationsByUserId.get(member.user_id).contact_value : null,
    } : {}),
    profile: profilesById.has(member.user_id)
      ? {
          ...profilesById.get(member.user_id),
          avatar_url: signedAvatarUrlsByPath.get(profilesById.get(member.user_id).avatar_url) ?? profilesById.get(member.user_id).avatar_url,
        }
      : null,
    last_sign_in_at: lastVisitsByUserId.get(member.user_id) ?? null,
  }))
  const pendingMembers = (invitations ?? [])
    .filter((invitation) => invitation.status === 'invited' && !invitation.invited_user_id)
    .map((invitation) => ({
      organization_id: invitation.organization_id,
      user_id: null,
      invitation_id: invitation.id,
      role: invitation.role,
      role_id: invitation.role_id,
      status: 'invited',
      invited_by: invitation.invited_by,
      invited_at: invitation.invited_at,
      created_at: invitation.created_at,
      updated_at: invitation.updated_at,
      organization_roles: invitation.organization_roles,
      profile: {
        id: null,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        phone: invitation.contact_type === 'phone' ? invitation.contact_value : null,
        avatar_url: null,
      },
      email: invitation.contact_type === 'email' ? invitation.contact_value : null,
      contact_type: invitation.contact_type,
      contact_value: invitation.contact_value,
      last_sign_in_at: null,
    }))
  return [...hydratedMembers, ...pendingMembers]
}

export async function getOrganizationMemberProfile(organizationId, userId) {
  const members = await listOrganizationMembers(organizationId, { includePendingInvitations: true })
  return members.find((member) => member.user_id === userId) ?? null
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
    .select('organization_id, user_id, role, status, invited_by, invited_at, joined_at, updated_at, updated_by')
    .single()
  if (error) throw error
  return data
}

export async function listOrganizationRoles(organizationId) {
  const { data, error } = await supabase
    .from('organization_roles')
    .select('id, organization_id, name, description, is_system, system_key, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listOrganizationTeams(organizationId) {
  const { data, error } = await supabase
    .from('organization_teams')
    .select('id, name')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listOrganizationTeamMemberships(organizationId) {
  const { data, error } = await supabase
    .from('organization_team_members')
    .select('team_id, user_id, organization_teams!inner(organization_id)')
    .eq('organization_teams.organization_id', organizationId)
  if (error) throw error
  return data ?? []
}

export async function assignOrganizationMemberRole({ organizationId, userId, roleId }) {
  const { data: role, error: roleError } = await supabase
    .from('organization_roles')
    .select('id, system_key, is_system')
    .eq('id', roleId)
    .eq('organization_id', organizationId)
    .single()
  if (roleError) throw roleError
  const legacyRole = role.system_key === 'organization_admin' ? 'admin' : 'member'
  const { data, error } = await supabase
    .from('organization_members')
    .update({ role_id: role.id, role: legacyRole })
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .select('organization_id, user_id, role, role_id, status, invited_by, invited_at, joined_at, updated_at, organization_roles(id, name, system_key, is_system)')
    .single()
  if (error) throw error
  return data
}

export async function listOrganizationRolePermissions(roleId) {
  const { data, error } = await supabase
    .from('organization_role_permissions')
    .select('permission_key, scope')
    .eq('role_id', roleId)
  if (error) throw error
  return data ?? []
}

export async function listCustomOrganizationRoles(organizationId) {
  const { data, error } = await supabase
    .from('organization_roles')
    .select('id, organization_id, name, description, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('is_system', false)
    .order('name', { ascending: true })
  if (error) throw error
  const roles = data ?? []
  if (!roles.length) return []

  const { data: permissionRows, error: permissionsError } = await supabase
    .from('organization_role_permissions')
    .select('role_id, permission_key, scope')
    .in('role_id', roles.map((role) => role.id))
  if (permissionsError) throw permissionsError

  const permissionsByRoleId = new Map(roles.map((role) => [role.id, {}]))
  for (const row of permissionRows ?? []) {
    const permissions = permissionsByRoleId.get(row.role_id)
    if (permissions) permissions[row.permission_key] = row.scope
  }
  return roles.map((role) => ({ ...role, permissions: permissionsByRoleId.get(role.id) ?? {} }))
}

function permissionRows(roleId, permissions = {}) {
  return Object.entries(permissions)
    .filter(([, scope]) => scope)
    .map(([permission_key, scope]) => ({ role_id: roleId, permission_key, scope }))
}

async function saveRolePermissions(roleId, permissions) {
  const rows = permissionRows(roleId, permissions)
  if (!rows.length) return
  const { error } = await supabase.from('organization_role_permissions').insert(rows)
  if (error) throw error
}

export async function createCustomOrganizationRole({ organizationId, name, description, baselineRoleKey = 'technician', permissions }) {
  const rolePermissions = validatePermissionGrants(permissions ?? getBaselinePermissions(baselineRoleKey))
  const { data, error } = await supabase
    .from('organization_roles')
    .insert({ organization_id: organizationId, name: name.trim(), description: description.trim() || null, created_by: (await getUserId()) })
    .select('id, organization_id, name, description, created_at, updated_at')
    .single()
  if (error) throw error
  try {
    await saveRolePermissions(data.id, rolePermissions)
  } catch (permissionsError) {
    await supabase.from('organization_roles').delete().eq('id', data.id)
    throw permissionsError
  }
  return { ...data, permissions: rolePermissions }
}

export async function updateCustomOrganizationRole({ roleId, organizationId, name, description, permissions }) {
  const validatedPermissions = validatePermissionGrants(permissions ?? {})
  const { data, error } = await supabase
    .from('organization_roles')
    .update({ name: name.trim(), description: description.trim() || null })
    .eq('id', roleId)
    .eq('organization_id', organizationId)
    .eq('is_system', false)
    .select('id, organization_id, name, description, created_at, updated_at')
    .single()
  if (error) throw error

  const { error: deleteError } = await supabase
    .from('organization_role_permissions')
    .delete()
    .eq('role_id', roleId)
  if (deleteError) throw deleteError
  await saveRolePermissions(roleId, validatedPermissions)
  return { ...data, permissions: validatedPermissions }
}

export async function deleteCustomOrganizationRole({ roleId, replacementRoleId }) {
  const { error } = await supabase.rpc('delete_custom_organization_role', {
    target_role_id: roleId,
    replacement_role_id: replacementRoleId,
  })
  if (error) throw error
}

export async function updateOrganization({ organizationId, updates }) {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', organizationId)
    .select('id, name, slug, description, logo_url, timezone, status, updated_at, updated_by')
    .single()
  if (error) throw error
  return data
}
