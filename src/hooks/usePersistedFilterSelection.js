import { useCallback, useMemo, useState } from 'react'

export function getFilterSelectionStorageKey({ moduleKey, userId, organizationId }) {
  if (!moduleKey || !userId || !organizationId) return null

  return `workbench.filterSelection.v1:${encodeURIComponent(moduleKey)}:${encodeURIComponent(userId)}:${encodeURIComponent(organizationId)}`
}

function readFilterSelection(storageKey, normalizeFilters) {
  if (!storageKey || typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? normalizeFilters(JSON.parse(stored)) : []
  } catch {
    return []
  }
}

function writeFilterSelection(storageKey, filters) {
  if (!storageKey || typeof window === 'undefined') return

  try {
    if (filters.length === 0) {
      window.localStorage.removeItem(storageKey)
      return
    }
    window.localStorage.setItem(storageKey, JSON.stringify(filters))
  } catch {
    // Storage can be unavailable or full; filter controls should still work.
  }
}

export function usePersistedFilterSelection({ moduleKey, userId, organizationId, normalizeFilters }) {
  const storageKey = getFilterSelectionStorageKey({ moduleKey, userId, organizationId })
  const [storedSelection, setStoredSelection] = useState(() => ({
    storageKey,
    filters: readFilterSelection(storageKey, normalizeFilters),
  }))
  const filters = useMemo(() => storedSelection.storageKey === storageKey
    ? storedSelection.filters
    : readFilterSelection(storageKey, normalizeFilters), [normalizeFilters, storageKey, storedSelection])

  const setFilters = useCallback((nextFilters) => {
    const filters = normalizeFilters(nextFilters)
    writeFilterSelection(storageKey, filters)
    setStoredSelection({ storageKey, filters })
  }, [normalizeFilters, storageKey])

  return {
    filters,
    setFilters,
  }
}
