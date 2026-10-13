import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  assertPermission: vi.fn(),
}))

vi.mock('../src/lib/supabase', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }))
vi.mock('../src/services/authorizationService', () => ({ assertPermission: mocks.assertPermission }))

import {
  createWorkOrderTimeEntry,
  deleteWorkOrderTimeEntry,
  listWorkOrderTimeEntries,
  startWorkOrderTimer,
  updateWorkOrderTimeEntry,
} from '../src/services/workOrderTimeService'

function queryBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

describe('workOrderTimeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rpc.mockResolvedValue({ data: { id: 'entry-1' }, error: null })
  })

  it('lists time entries through the permitted Work Order query', async () => {
    const builder = queryBuilder({ data: [{ id: 'entry-1' }], error: null })
    mocks.from.mockReturnValue(builder)

    await expect(listWorkOrderTimeEntries({ organizationId: 'org-1', workOrderId: 'wo-1', grants: {}, record: {} })).resolves.toEqual([{ id: 'entry-1' }])
    expect(mocks.assertPermission).toHaveBeenCalledWith({}, 'work_orders.view', {})
    expect(mocks.from).toHaveBeenCalledWith('work_order_time_entries')
    expect(builder.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(builder.eq).toHaveBeenCalledWith('work_order_id', 'wo-1')
  })

  it('uses the server timer RPC and forwards the Work Order identity', async () => {
    await startWorkOrderTimer({ workOrderId: 'wo-1', trackingTypeId: 'type-1', grants: {}, record: {} })
    expect(mocks.rpc).toHaveBeenCalledWith('start_work_order_timer', {
      target_work_order_id: 'wo-1',
      target_tracking_type_id: 'type-1',
    })
  })

  it('creates manual time through the server contract', async () => {
    await createWorkOrderTimeEntry({ workOrderId: 'wo-1', userId: 'user-1', trackingTypeId: 'type-1', durationSeconds: 3600, hourlyRate: 30, notes: 'Inspection', grants: {}, record: {} })
    expect(mocks.rpc).toHaveBeenCalledWith('create_work_order_time_entry', {
      target_work_order_id: 'wo-1',
      target_user_id: 'user-1',
      target_tracking_type_id: 'type-1',
      target_duration_seconds: 3600,
      target_hourly_rate: 30,
      target_notes: 'Inspection',
    })
  })

  it('routes edits and deletes through audited server RPCs', async () => {
    await updateWorkOrderTimeEntry({ timeEntryId: 'entry-1', trackingTypeId: 'type-1', durationSeconds: 1800, hourlyRate: null, notes: '', grants: {}, record: {} })
    await deleteWorkOrderTimeEntry({ timeEntryId: 'entry-1', grants: {}, record: {} })
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'update_work_order_time_entry', {
      target_time_entry_id: 'entry-1',
      target_tracking_type_id: 'type-1',
      target_duration_seconds: 1800,
      target_hourly_rate: null,
      target_notes: null,
    })
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'delete_work_order_time_entry', { target_time_entry_id: 'entry-1' })
  })
})

