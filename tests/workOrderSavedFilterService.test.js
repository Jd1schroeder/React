import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../src/lib/supabase', () => ({ supabase: { from } }))

const { createWorkOrderSavedFilter, listWorkOrderSavedFilters } = await import('../src/services/workOrderSavedFilterService')

describe('workOrderSavedFilterService', () => {
  beforeEach(() => from.mockReset())

  it('requires the Work Order view permission before listing saved filters', async () => {
    await expect(listWorkOrderSavedFilters({ organizationId: 'org-1', grants: {} }))
      .rejects.toThrow('work_orders.view')
    expect(from).not.toHaveBeenCalled()
  })

  it('requires the saved-filter permission before writing', async () => {
    await expect(createWorkOrderSavedFilter({
      organizationId: 'org-1',
      name: 'Open',
      filters: [{ field: 'status', operator: 'one_of', values: ['Open'] }],
      grants: {},
    })).rejects.toThrow('work_orders.manage_saved_filters')
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects organization-wide filter creation by non-admins before querying', async () => {
    await expect(createWorkOrderSavedFilter({
      organizationId: 'org-1',
      filterScope: 'organization',
      name: 'Open',
      filters: [{ field: 'status', operator: 'one_of', values: ['Open'] }],
      grants: { 'work_orders.manage_saved_filters': 'any' },
    })).rejects.toThrow('Only organization administrators')
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects empty filter sets rather than persisting unusable saved filters', async () => {
    await expect(createWorkOrderSavedFilter({
      organizationId: 'org-1',
      name: 'Empty',
      filters: [],
      grants: { 'work_orders.manage_saved_filters': 'any' },
    })).rejects.toThrow('Add at least one valid filter')
    expect(from).not.toHaveBeenCalled()
  })
})
