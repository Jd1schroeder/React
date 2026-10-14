import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  invoke: vi.fn(),
  rpc: vi.fn(),
  setAuth: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}))

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    functions: { invoke: mocks.invoke },
    rpc: mocks.rpc,
    realtime: { setAuth: mocks.setAuth },
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}))

const {
  isCurrentSessionValid,
  listCurrentUserSessions,
  registerCurrentSession,
  revokeCurrentUserSession,
} = await import('../src/services/sessionService')

function accessToken(sessionId) {
  return `header.${btoa(JSON.stringify({ session_id: sessionId }))}.signature`
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.setAuth.mockResolvedValue({ data: {}, error: null })
  mocks.channel.mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })
})

describe('sessionService', () => {
  it('registers a current Auth session through the Edge Function boundary', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: accessToken('session-1') } }, error: null })
    mocks.invoke.mockResolvedValue({ data: { session_id: 'session-1' }, error: null })

    await expect(registerCurrentSession()).resolves.toEqual({ session_id: 'session-1', is_current: true })
    expect(mocks.invoke).toHaveBeenCalledWith('register-session', expect.objectContaining({
      body: expect.objectContaining({ sessionId: 'session-1', deviceId: expect.any(String) }),
    }))
  })

  it('validates the current session through the authenticated RPC', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: accessToken('session-1') } }, error: null })
    mocks.rpc.mockResolvedValue({ data: true, error: null })

    await expect(isCurrentSessionValid()).resolves.toBe(true)
    expect(mocks.rpc).toHaveBeenCalledWith('is_current_user_session_valid', { target_session_id: 'session-1' })
  })

  it('fails closed when no session or an RPC revocation occurs', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    await expect(isCurrentSessionValid()).resolves.toBe(false)
    expect(mocks.rpc).not.toHaveBeenCalled()

    mocks.rpc.mockResolvedValue({ data: null, error: null })
    await expect(revokeCurrentUserSession('session-1')).resolves.toBeUndefined()
    expect(mocks.rpc).toHaveBeenCalledWith('revoke_current_user_session', { target_session_id: 'session-1' })
  })

  it('marks the current session when listing sanitized session rows', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: accessToken('session-1') } }, error: null })
    mocks.rpc.mockResolvedValue({ data: [{ session_id: 'session-1' }, { session_id: 'session-2' }], error: null })

    await expect(listCurrentUserSessions()).resolves.toEqual([
      { session_id: 'session-1', is_current: true },
      { session_id: 'session-2', is_current: false },
    ])
  })
})
