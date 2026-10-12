import { supabase } from '../lib/supabase'
import { getAvatarSignedUrl } from './profileService'
import { getOrganizationLogoSignedUrl } from './organizationService'
import { permissionMap } from './authorizationService'

export async function getCurrentWorkspace(organizationId = window.localStorage.getItem('workbench.activeOrganizationId')) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const user = sessionData.session?.user ?? null
  if (!user) return { user: null, organization: null }

  const [membershipResult, profileResult, preferencesResult] = await Promise.allSettled([
    supabase
      .from('organization_members')
      .select('organization_id, role, role_id, status, organization_roles(id, name, system_key, is_system), organizations(id, organization_number, name, slug, description, address_line_1, address_line_2, city, state_or_region, postal_code, country, logo_url, feature_labels, work_order_settings, work_order_start_number, timezone, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, user_number, first_name, last_name, phone, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('user_preferences').select('language, date_format, time_format, week_start, timezone').eq('user_id', user.id).maybeSingle(),
  ])

  const memberships = membershipResult.status === 'fulfilled' && !membershipResult.value.error
    ? membershipResult.value.data ?? []
    : []
  const profile = profileResult.status === 'fulfilled' && !profileResult.value.error
    ? profileResult.value.data
    : null
  const preferences = preferencesResult.status === 'fulfilled' && !preferencesResult.value.error
    ? preferencesResult.value.data
    : null
  const organizations = (memberships ?? []).map(({ organizations: organization, organization_roles: roleDefinition, ...membership }) => ({
    ...organization,
    role: membership.role,
    roleId: membership.role_id,
    roleDefinition,
    membershipStatus: membership.status,
    organizationStatus: organization?.status ?? 'active',
  }))
  const activeOrganizations = organizations.filter((item) => item.membershipStatus === 'active' && item.organizationStatus !== 'suspended')
  const organization = activeOrganizations.find((item) => item.id === organizationId)
    ?? activeOrganizations[0]
    ?? organizations.find((item) => item.id === organizationId)
    ?? organizations[0]
    ?? null
  const hasActiveOrganization = activeOrganizations.length > 0
  const hasSuspendedOrganization = organizations.some((item) => item.membershipStatus === 'suspended' || item.organizationStatus === 'suspended')
  const accessStatus = hasActiveOrganization ? 'active' : hasSuspendedOrganization ? 'suspended' : 'none'
  const signedAvatarUrlPromise = profile
    ? getAvatarSignedUrl(profile.avatar_url).catch(() => {
      // Keep the profile data usable and let the avatar component render initials.
      return ""
    })
    : Promise.resolve("")

  let authorization = { status: 'error', roleId: organization?.roleId ?? null, grants: {} }
  let teamIds = []
  if (organization?.roleId && organization.membershipStatus === 'active' && organization.organizationStatus !== 'suspended') {
    const [{ data: permissionRows, error: permissionError }, { data: teamMembershipRows, error: teamMembershipError }] = await Promise.all([
      supabase
        .from('organization_role_permissions')
        .select('permission_key, scope')
        .eq('role_id', organization.roleId),
      supabase
        .from('organization_team_members')
        .select('team_id, organization_teams!inner(organization_id)')
        .eq('user_id', user.id)
        .eq('organization_teams.organization_id', organization.id),
    ])
    if (permissionError) throw permissionError
    if (teamMembershipError) throw teamMembershipError
    teamIds = (teamMembershipRows ?? []).map((row) => row.team_id)
    authorization = { status: 'ready', roleId: organization.roleId, grants: permissionMap(permissionRows ?? []) }
  }

  const signedAvatarUrl = await signedAvatarUrlPromise
  const signedOrganizationLogoUrl = organization?.logo_url
    ? await getOrganizationLogoSignedUrl(organization.logo_url).catch(() => '')
    : ''
  const profileWithAvatar = profile
    ? { ...profile, avatar_path: profile.avatar_url, avatar_url: signedAvatarUrl }
    : null

  return { user, profile: profileWithAvatar, preferences, organizations, organization: organization ? { ...organization, logo_url: signedOrganizationLogoUrl } : organization, accessStatus, authorization, teamIds }
}

export function setActiveOrganization(organizationId) {
  window.localStorage.setItem('workbench.activeOrganizationId', organizationId)
  window.dispatchEvent(new CustomEvent('workbench:organization-changed', { detail: organizationId }))
}
