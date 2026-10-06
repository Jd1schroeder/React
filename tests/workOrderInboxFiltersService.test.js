import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/supabase', () => ({ supabase: { rpc } }))

import {
  listWorkOrderInboxCounts,
  listWorkOrderInboxPage,
  markWorkOrderInboxRead,
} from '../src/services/workOrderService'

const grants = { 'work_orders.view': 'organization' }
const filters = [{ field: 'status', operator: 'one_of', values: ['Open'] }]

beforeEach(() => {
  rpc.mockReset()
  rpc.mockResolvedValue({ data: [], error: null })
})

describe('Work Order inbox filter RPC contract', () => {
  it('passes normalized filters to the exact group-count query', async () => {
    rpc.mockResolvedValueOnce({ data: { 'all-open': 3 }, error: null })
    await expect(listWorkOrderInboxCounts({ organizationId: 'org-1', tab: 'To Do', filters, grants }))
      .resolves.toEqual({ 'all-open': 3 })

    expect(rpc).toHaveBeenCalledWith('get_work_order_inbox_counts', expect.objectContaining({
      target_organization_id: 'org-1',
      target_tab: 'To Do',
      target_filters: filters,
    }))
  })

  it('passes filters to paginated rows and mark-all-read so all list behavior shares one predicate', async () => {
    await listWorkOrderInboxPage({
      organizationId: 'org-1', tab: 'To Do', group: 'all-open', search: '',
      sort: 'created-oldest', offset: 0, filters, grants,
    })
    await markWorkOrderInboxRead({ organizationId: 'org-1', tab: 'To Do', search: '', filters, grants })

    expect(rpc).toHaveBeenNthCalledWith(1, 'get_work_order_inbox_page', expect.objectContaining({
      target_filters: filters,
      target_page_size: 50,
    }))
    expect(rpc).toHaveBeenNthCalledWith(2, 'mark_work_order_inbox_read', expect.objectContaining({
      target_filters: filters,
    }))
  })
})
