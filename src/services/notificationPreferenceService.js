import { supabase } from '../lib/supabase'

const CACHE_TTL_MS = 60_000
const notificationSettingsCache = new Map()
const notificationSettingsRequests = new Map()

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in to update notification preferences.')
  return data.user.id
}

export async function loadNotificationSettings(userId) {
  const resolvedUserId = userId ?? await getCurrentUserId()
  const cached = notificationSettingsCache.get(resolvedUserId)
  if (cached && cached.expiresAt > Date.now()) return cached.settings

  const inFlightRequest = notificationSettingsRequests.get(resolvedUserId)
  if (inFlightRequest) return inFlightRequest

  const request = supabase
    .from('user_preferences')
    .select('notification_settings')
    .eq('user_id', resolvedUserId)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) throw error
      const settings = data?.notification_settings ?? {}
      notificationSettingsCache.set(resolvedUserId, { settings, expiresAt: Date.now() + CACHE_TTL_MS })
      return settings
    })
    .finally(() => {
      if (notificationSettingsRequests.get(resolvedUserId) === request) notificationSettingsRequests.delete(resolvedUserId)
    })

  notificationSettingsRequests.set(resolvedUserId, request)
  return request
}

export function preloadNotificationSettings(userId) {
  if (!userId) return Promise.resolve(null)
  return loadNotificationSettings(userId)
}

export async function saveNotificationSettings(settings) {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, notification_settings: settings }, { onConflict: 'user_id' })
    .select('notification_settings')
    .single()

  if (error) throw error
  const savedSettings = data.notification_settings
  notificationSettingsCache.set(userId, { settings: savedSettings, expiresAt: Date.now() + CACHE_TTL_MS })
  return savedSettings
}
