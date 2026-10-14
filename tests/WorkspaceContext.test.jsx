import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceProvider } from '../src/components/layout/WorkspaceContext'
import { useWorkspace } from '../src/components/layout/useWorkspace'

const mocks = vi.hoisted(() => ({
  getCurrentWorkspace: vi.fn(),
  registerCurrentSession: vi.fn(),
  isCurrentSessionValid: vi.fn(),
  subscribeToSessionRevocations: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../src/services/workspaceService', () => ({
  getCurrentWorkspace: mocks.getCurrentWorkspace,
}))

vi.mock('../src/services/sessionService', () => ({
  registerCurrentSession: mocks.registerCurrentSession,
  isCurrentSessionValid: mocks.isCurrentSessionValid,
  subscribeToSessionRevocations: mocks.subscribeToSessionRevocations,
}))

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}))

function WorkspaceProbe() {
  const workspace = useWorkspace()
  return <span>Loaded {workspace.user.id}</span>
}

function readyWorkspace() {
  return {
    user: { id: 'user-1' },
    organization: { id: 'org-1', name: 'Acme Corp' },
    organizations: [{ id: 'org-1', name: 'Acme Corp' }],
    accessStatus: 'active',
    authorization: { status: 'ready', roleId: 'role-1', grants: { 'work_orders.view': 'any' } },
    teamIds: [],
  }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.registerCurrentSession.mockResolvedValue(null)
  mocks.isCurrentSessionValid.mockResolvedValue(true)
  mocks.subscribeToSessionRevocations.mockResolvedValue(vi.fn())
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  mocks.signOut.mockResolvedValue({ error: null })
})

describe('WorkspaceProvider authentication boundary', () => {
  it('redirects to login when the workspace has no authenticated user', async () => {
    mocks.getCurrentWorkspace.mockResolvedValue({ user: null, organization: null })
    const onNavigate = vi.fn()

    render(<WorkspaceProvider onNavigate={onNavigate}><WorkspaceProbe /></WorkspaceProvider>)

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('Login'))
    expect(screen.queryByText('Loaded user-1')).not.toBeInTheDocument()
  })

  it('exposes a ready workspace only after authorization data loads', async () => {
    mocks.getCurrentWorkspace.mockResolvedValue(readyWorkspace())

    render(<WorkspaceProvider onNavigate={vi.fn()}><WorkspaceProbe /></WorkspaceProvider>)

    expect(await screen.findByText('Loaded user-1')).toBeInTheDocument()
    expect(mocks.registerCurrentSession).toHaveBeenCalledOnce()
    expect(mocks.subscribeToSessionRevocations).toHaveBeenCalledWith('user-1', expect.any(Function))
  })

  it('shows a retry state after workspace loading fails', async () => {
    mocks.getCurrentWorkspace
      .mockRejectedValueOnce(new Error('Workspace unavailable'))
      .mockResolvedValueOnce(readyWorkspace())

    render(<WorkspaceProvider onNavigate={vi.fn()}><WorkspaceProbe /></WorkspaceProvider>)

    expect(await screen.findByRole('heading', { name: 'Unable to load your workspace' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Loaded user-1')).toBeInTheDocument()
  })

  it('signs out locally when the server confirms the current session was revoked', async () => {
    mocks.getCurrentWorkspace.mockResolvedValue(readyWorkspace())
    mocks.isCurrentSessionValid.mockResolvedValue(false)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })

    render(<WorkspaceProvider onNavigate={vi.fn()}><WorkspaceProbe /></WorkspaceProvider>)
    await screen.findByText('Loaded user-1')
    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' }))
  })
})
