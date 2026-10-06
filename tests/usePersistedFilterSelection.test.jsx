import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getFilterSelectionStorageKey, usePersistedFilterSelection } from '../src/hooks/usePersistedFilterSelection'
import { normalizeWorkOrderFilters } from '../src/utils/workOrderFilters'

const baseScope = {
  moduleKey: 'work-orders',
  userId: 'user-a',
  organizationId: 'org-a',
  normalizeFilters: normalizeWorkOrderFilters,
}

const openStatusFilter = [{ field: 'status', operator: 'one_of', values: ['Open'] }]

describe('usePersistedFilterSelection', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('persists a selection and restores it after the page is remounted', () => {
    const firstMount = renderHook(() => usePersistedFilterSelection(baseScope))

    act(() => firstMount.result.current.setFilters(openStatusFilter))
    expect(firstMount.result.current.filters).toEqual(openStatusFilter)
    firstMount.unmount()

    const nextMount = renderHook(() => usePersistedFilterSelection(baseScope))
    expect(nextMount.result.current.filters).toEqual(openStatusFilter)
  })

  it('isolates selections by module, user, and organization', async () => {
    const workOrderKey = getFilterSelectionStorageKey(baseScope)
    expect(workOrderKey).not.toBe(getFilterSelectionStorageKey({ ...baseScope, moduleKey: 'assets' }))
    expect(workOrderKey).not.toBe(getFilterSelectionStorageKey({ ...baseScope, userId: 'user-b' }))
    expect(workOrderKey).not.toBe(getFilterSelectionStorageKey({ ...baseScope, organizationId: 'org-b' }))
    const otherScope = {
      ...baseScope,
      moduleKey: 'assets',
      userId: 'user-b',
      organizationId: 'org-b',
    }
    const otherScopeKey = getFilterSelectionStorageKey(otherScope)
    window.localStorage.setItem(workOrderKey, JSON.stringify(openStatusFilter))
    window.localStorage.setItem(otherScopeKey, JSON.stringify([
      { field: 'status', operator: 'one_of', values: ['Completed'] },
    ]))

    const { result, rerender } = renderHook((scope) => usePersistedFilterSelection(scope), {
      initialProps: baseScope,
    })
    expect(result.current.filters).toEqual(openStatusFilter)

    rerender(otherScope)
    await waitFor(() => expect(result.current.filters).toEqual([
      { field: 'status', operator: 'one_of', values: ['Completed'] },
    ]))
  })

  it('ignores malformed stored data and removes the entry when cleared', () => {
    const storageKey = getFilterSelectionStorageKey(baseScope)
    window.localStorage.setItem(storageKey, '{invalid json')

    const { result } = renderHook(() => usePersistedFilterSelection(baseScope))
    expect(result.current.filters).toEqual([])

    act(() => result.current.setFilters([
      ...openStatusFilter,
      { field: 'unknown', operator: 'one_of', values: ['value'] },
    ]))
    expect(result.current.filters).toEqual(openStatusFilter)

    act(() => result.current.setFilters([]))
    expect(window.localStorage.getItem(storageKey)).toBeNull()
  })
})
