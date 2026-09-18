import { supabase } from '../lib/supabase'

export async function signUpWithOrganization({ email, password, firstName, lastName, phone, phoneCountry, organizationName, teamSize }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        phone_country: phoneCountry,
        organization_name: organizationName,
        team_size: teamSize,
      },
    },
  })

  if (error) throw error
  return data
}

export async function signInWithPassword({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}
