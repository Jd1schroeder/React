import { supabase } from '../lib/supabase'
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

export async function listOrganizationMembers(organizationId) {
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('organization_id, user_id, role, role_id, status, invited_by, invited_at, joined_at, created_at, updated_at, organization_roles(id, name, system_key, is_system)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
  if (membersError) throw membersError
  if (!members?.length) return []

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone, avatar_url')
    .in('id', members.map((member) => member.user_id))
  if (profilesError) throw profilesError

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
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
  const { data: lastVisits, error: lastVisitsError } = await supabase.rpc('get_organization_member_last_visits', {
    target_organization_id: organizationId,
  })
  const lastVisitsByUserId = new Map((lastVisitsError ? [] : lastVisits ?? []).map((visit) => [visit.user_id, visit.last_sign_in_at]))
  return members.map((member) => ({
    ...member,
    profile: profilesById.has(member.user_id)
      ? {
          ...profilesById.get(member.user_id),
          avatar_url: signedAvatarUrlsByPath.get(profilesById.get(member.user_id).avatar_url) ?? profilesById.get(member.user_id).avatar_url,
        }
      : null,
    last_sign_in_at: lastVisitsByUserId.get(member.user_id) ?? null,
  }))
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
