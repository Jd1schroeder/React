import { supabase } from '../lib/supabase'
import { getAvatarSignedUrl } from './profileService'

export async function getCurrentWorkspace(organizationId = window.localStorage.getItem('workbench.activeOrganizationId')) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const user = userData.user
  if (!user) return { user: null, organization: null }

  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id, role, status, organizations(id, name, slug, description, logo_url, timezone, status)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  if (membershipError) throw membershipError

  const [{ data: profile, error: profileError }, { data: preferences, error: preferencesError }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, phone, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('user_preferences').select('language, date_format, time_format, week_start, timezone').eq('user_id', user.id).maybeSingle(),
  ])
  if (profileError) throw profileError
  if (preferencesError) throw preferencesError
  const profileWithAvatar = profile
    ? { ...profile, avatar_path: profile.avatar_url, avatar_url: await getAvatarSignedUrl(profile.avatar_url) }
    : profile
  const organizations = (memberships ?? []).map(({ organizations: organization, ...membership }) => ({ ...organization, role: membership.role, membershipStatus: membership.status }))
  const organization = organizations.find((item) => item.id === organizationId) ?? organizations[0] ?? null

  return { user, profile: profileWithAvatar, preferences, organizations, organization }
}

export function setActiveOrganization(organizationId) {
  window.localStorage.setItem('workbench.activeOrganizationId', organizationId)
  window.dispatchEvent(new CustomEvent('workbench:organization-changed', { detail: organizationId }))
}
