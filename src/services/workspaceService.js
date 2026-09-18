import { supabase } from '../lib/supabase'

export async function getCurrentWorkspace() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const user = userData.user
  if (!user) return { user: null, organization: null }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (membershipError) throw membershipError
  if (!membership) return { user, organization: null }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', membership.organization_id)
    .maybeSingle()
  if (organizationError) throw organizationError

  return { user, organization }
}
