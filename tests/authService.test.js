import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithPasskey: vi.fn(),
  registerPasskey: vi.fn(),
  listPasskeys: vi.fn(),
}))

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      signInWithPasskey: mocks.signInWithPasskey,
      registerPasskey: mocks.registerPasskey,
      passkey: { list: mocks.listPasskeys },
    },
  },
}))

const {
  listPasskeys,
  registerPasskey,
  signInWithPasskey,
  signInWithPassword,
  signUpWithOrganization,
} = await import('../src/services/authService')

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', { configurable: true, value: { origin: 'http://localhost:5173' } })
})

describe('authService', () => {
  it('forwards signup metadata and the verification redirect', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    await signUpWithOrganization({
      email: 'josh@example.com',
      password: 'example-password',
      firstName: 'Josh',
      lastName: 'Schroeder',
      phone: '555-0100',
      phoneCountry: 'US',
      organizationName: 'Acme Corp',
      teamSize: '11-50',
    })

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'josh@example.com',
      password: 'example-password',
      options: {
        emailRedirectTo: 'http://localhost:5173/verify-email',
        data: {
          first_name: 'Josh',
          last_name: 'Schroeder',
          phone: '555-0100',
          phone_country: 'US',
          organization_name: 'Acme Corp',
          team_size: '11-50',
        },
      },
    })
  })

  it('returns successful password and passkey responses', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null })
    mocks.signInWithPasskey.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null })

    await expect(signInWithPassword({ email: 'josh@example.com', password: 'example-password' })).resolves.toEqual({ session: { access_token: 'token' } })
    await expect(signInWithPasskey()).resolves.toEqual({ session: { access_token: 'token' } })
  })

  it('throws Supabase errors instead of hiding auth failures', async () => {
    const error = new Error('Invalid login')
    mocks.signInWithPassword.mockResolvedValue({ data: null, error })

    await expect(signInWithPassword({ email: 'josh@example.com', password: 'wrong' })).rejects.toBe(error)
  })

  it('wraps passkey registration and listing', async () => {
    mocks.registerPasskey.mockResolvedValue({ data: { id: 'credential-1' }, error: null })
    mocks.listPasskeys.mockResolvedValue({ data: [{ id: 'credential-1' }], error: null })

    await expect(registerPasskey()).resolves.toEqual({ id: 'credential-1' })
    await expect(listPasskeys()).resolves.toEqual([{ id: 'credential-1' }])
  })
})
