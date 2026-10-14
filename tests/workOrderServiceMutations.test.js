import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  assertPermission: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  storageFrom: vi.fn(),
}))

vi.mock('../src/services/authorizationService', () => ({
  assertPermission: mocks.assertPermission,
}))

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    storage: { from: mocks.storageFrom },
  },
}))

const { createWorkOrder } = await import('../src/services/workOrderService')

afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mocks.rpc.mockResolvedValue({ data: { id: 'wo-1', title: 'Inspect pump' }, error: null })
  mocks.storageFrom.mockReturnValue({
    upload: vi.fn().mockResolvedValue({ error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
    createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
  })
})

describe('Work Order creation service boundary', () => {
  it('validates the create contract and sends normalized RPC arguments', async () => {
    const result = await createWorkOrder({
      organizationId: 'org-1',
      title: '  Inspect pump  ',
      description: '  Check the motor. ',
      priority: 'High',
      dueDate: '2026-10-16',
      dueTime: '14:30',
      startDate: null,
      estimatedDurationMinutes: 90,
      workType: 'reactive',
      assignments: [{ userId: 'user-2' }, { teamId: 'team-1' }],
      grants: { 'work_orders.create': 'any', 'work_orders.assign': 'any' },
    })

    expect(result).toEqual(expect.objectContaining({ id: 'wo-1', title: 'Inspect pump' }))
    expect(mocks.assertPermission).toHaveBeenNthCalledWith(1, { 'work_orders.create': 'any', 'work_orders.assign': 'any' }, 'work_orders.create')
    expect(mocks.assertPermission).toHaveBeenNthCalledWith(2, { 'work_orders.create': 'any', 'work_orders.assign': 'any' }, 'work_orders.assign')
    expect(mocks.rpc).toHaveBeenCalledWith('create_work_order_with_assignments', expect.objectContaining({
      target_organization_id: 'org-1',
      target_title: 'Inspect pump',
      target_description: 'Check the motor.',
      target_priority: 'High',
      target_estimated_duration_minutes: 90,
      target_assignments: [{ user_id: 'user-2', team_id: null }, { user_id: null, team_id: 'team-1' }],
    }))
  })

  it('rejects invalid input before making an Auth or database request', async () => {
    await expect(createWorkOrder({
      organizationId: 'org-1',
      title: ' ',
      priority: null,
      workType: 'reactive',
      grants: { 'work_orders.create': 'any' },
    })).rejects.toThrow('A Work Order title is required.')

    expect(mocks.getUser).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('removes uploaded objects when the transactional RPC fails', async () => {
    const storageApi = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrls: vi.fn(),
    }
    mocks.storageFrom.mockReturnValue(storageApi)
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('Create failed') })
    const picture = new File(['image'], 'pump.jpg', { type: 'image/jpeg' })

    await expect(createWorkOrder({
      organizationId: 'org-1',
      title: 'Inspect pump',
      priority: null,
      workType: 'reactive',
      pictures: [picture],
      thumbnail: picture,
      grants: { 'work_orders.create': 'any' },
    })).rejects.toThrow('Create failed')

    expect(storageApi.upload).toHaveBeenCalledOnce()
    expect(storageApi.remove).toHaveBeenCalledWith([expect.stringMatching(/^org-1\/user-1\/[^/]+\/[^/]+\.jpg$/)])
  })
})
