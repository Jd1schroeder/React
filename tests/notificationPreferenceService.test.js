import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMock = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}))

vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }))

const { loadNotificationSettings, preloadNotificationSettings, saveNotificationSettings } = await import('../src/services/notificationPreferenceService')

describe('notificationPreferenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('loads preferences from the signed-in user row', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { notification_settings: { 'Work Orders.Created by me.Becomes overdue.email': true } }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    supabaseMock.from.mockReturnValue({ select })

    await expect(loadNotificationSettings()).resolves.toEqual({ 'Work Orders.Created by me.Becomes overdue.email': true })
    expect(supabaseMock.from).toHaveBeenCalledWith('user_preferences')
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('shares a preloaded request and reuses its result for the page load', async () => {
    const settings = { 'Messages.mode': 'All messages' }
    const maybeSingle = vi.fn().mockResolvedValue({ data: { notification_settings: settings }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    supabaseMock.from.mockReturnValue({ select })

    await expect(preloadNotificationSettings('prefetch-user')).resolves.toEqual(settings)
    await expect(loadNotificationSettings('prefetch-user')).resolves.toEqual(settings)

    expect(supabaseMock.auth.getUser).not.toHaveBeenCalled()
    expect(supabaseMock.from).toHaveBeenCalledOnce()
  })

  it('saves preferences to the signed-in user row', async () => {
    const settings = { 'Requests.Requiring approval.Unassigned.app': true }
    const single = vi.fn().mockResolvedValue({ data: { notification_settings: settings }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const upsert = vi.fn().mockReturnValue({ select })
    supabaseMock.from.mockReturnValue({ upsert })

    await expect(saveNotificationSettings(settings)).resolves.toEqual(settings)
    expect(upsert).toHaveBeenCalledWith({ user_id: 'user-1', notification_settings: settings }, { onConflict: 'user_id' })
  })

  it('rejects reads and writes without an authenticated user', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(loadNotificationSettings()).rejects.toThrow('You must be signed in')
    await expect(saveNotificationSettings({})).rejects.toThrow('You must be signed in')
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })
})
