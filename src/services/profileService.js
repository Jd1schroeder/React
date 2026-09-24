import { supabase } from '../lib/supabase'

async function getUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in to update your profile.')
  return data.user.id
}

export async function uploadAvatar(file) {
  await getUserId()
  const formData = new FormData()
  formData.append('file', file)
  const { data, error } = await supabase.functions.invoke('upload-avatar', { body: formData })
  if (error) throw error
  return data
}

export async function getAvatarSignedUrl(path) {
  if (!path || path.startsWith('http')) return path || ''
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60)
  if (error) throw error
  return data?.signedUrl ?? ''
}

export async function updateProfile({ firstName, lastName, phone, avatarUrl }) {
  const userId = await getUserId()
  const profile = { id: userId, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone?.trim() || null }
  if (avatarUrl !== undefined) profile.avatar_url = avatarUrl
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select('id, first_name, last_name, avatar_url')
    .single()
  if (error) throw error
  return data
}

export async function updateAuthContact({ email, phone }) {
  const updates = {}
  if (email !== undefined) updates.email = email.trim()
  if (phone !== undefined) updates.phone = phone.trim() || null
  if (!Object.keys(updates).length) return null

  const { data, error } = await supabase.auth.updateUser(updates)
  if (error) throw error
  return data.user
}

export async function updateUserPreferences({ language, dateFormat, timeFormat, weekStart, timezone }) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      language,
      date_format: dateFormat,
      time_format: timeFormat,
      week_start: weekStart,
      timezone,
    }, { onConflict: 'user_id' })
    .select('language, date_format, time_format, week_start, timezone')
    .single()
  if (error) throw error
  return data
}
