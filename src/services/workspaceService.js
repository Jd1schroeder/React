import { supabase } from '../lib/supabase'
import { getAvatarSignedUrl } from './profileService'

export async function getCurrentWorkspace(organizationId = window.localStorage.getItem('workbench.activeOrganizationId')) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const user = sessionData.session?.user ?? null
  if (!user) return { user: null, organization: null }

  const [membershipResult, profileResult, preferencesResult] = await Promise.allSettled([
    supabase
      .from('organization_members')
      .select('organization_id, role, status, organizations(id, name, slug, description, logo_url, timezone, status)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, first_name, last_name, phone, avatar_url').eq('id', user.id).maybeSingle(),
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
  let profileWithAvatar = profile
  if (profile) {
    let signedAvatarUrl = ""
    try {
      signedAvatarUrl = await getAvatarSignedUrl(profile.avatar_url)
    } catch {
      // Keep the profile data usable and let the avatar component render initials.
    }
    profileWithAvatar = { ...profile, avatar_path: profile.avatar_url, avatar_url: signedAvatarUrl }
  }
  const organizations = (memberships ?? []).map(({ organizations: organization, ...membership }) => ({ ...organization, role: membership.role, membershipStatus: membership.status }))
  const organization = organizations.find((item) => item.id === organizationId) ?? organizations[0] ?? null

  return { user, profile: profileWithAvatar, preferences, organizations, organization }
}

export function setActiveOrganization(organizationId) {
  window.localStorage.setItem('workbench.activeOrganizationId', organizationId)
  window.dispatchEvent(new CustomEvent('workbench:organization-changed', { detail: organizationId }))
}
