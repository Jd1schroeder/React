import { supabase } from '../lib/supabase'

async function invokeAccountFunction(body) {
  const { data, error } = await supabase.functions.invoke('manage-user-account', { body })
  if (error) throw error
  return data
}

export function getOrganizationMemberAccount({ organizationId, userId }) {
  return invokeAccountFunction({ action: 'get', organizationId, userId })
}

export function updateOrganizationMemberAccount({ organizationId, userId, firstName, lastName, phone, email }) {
  return invokeAccountFunction({ action: 'update', organizationId, userId, firstName, lastName, phone, email })
}
