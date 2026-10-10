import { supabase } from '../lib/supabase'

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in to update notification preferences.')
  return data.user.id
}

export async function loadNotificationSettings() {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('user_preferences')
    .select('notification_settings')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.notification_settings ?? {}
}

export async function saveNotificationSettings(settings) {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, notification_settings: settings }, { onConflict: 'user_id' })
    .select('notification_settings')
    .single()

  if (error) throw error
  return data.notification_settings
}
