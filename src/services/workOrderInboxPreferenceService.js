import { supabase } from '../lib/supabase'

const defaultPreferences = { sortId: 'priority-highest', unreadFirst: false }
let preferenceWriteQueue = Promise.resolve()
const allowedSortIds = new Set([
  'created-oldest', 'created-newest', 'due-earliest', 'due-latest',
  'updated-oldest', 'updated-newest', 'priority-highest', 'priority-lowest',
])

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in to access Work Order Inbox preferences.')
  return data.user.id
}

export async function getWorkOrderInboxPreferences({ organizationId }) {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('work_order_inbox_preferences')
    .select('sort_id, unread_first')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (error) throw error
  return data
    ? { sortId: allowedSortIds.has(data.sort_id) ? data.sort_id : defaultPreferences.sortId, unreadFirst: data.unread_first }
    : defaultPreferences
}

export function saveWorkOrderInboxPreferences({ organizationId, sortId, unreadFirst }) {
  if (!allowedSortIds.has(sortId)) throw new Error('Choose a valid Work Order sort order.')
  const write = async () => {
    const userId = await getCurrentUserId()
    const { error } = await supabase
      .from('work_order_inbox_preferences')
      .upsert({ user_id: userId, organization_id: organizationId, sort_id: sortId, unread_first: unreadFirst }, { onConflict: 'user_id,organization_id' })
    if (error) throw error
  }
  const result = preferenceWriteQueue.then(write, write)
  preferenceWriteQueue = result.catch(() => {})
  return result
}
