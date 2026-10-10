import { useEffect, useLayoutEffect, useState } from 'react'

export function useMobileWorkOrderNavigation() {
  const [utilityPage, setUtilityPage] = useState(null)
  const [filterSubpage, setFilterSubpage] = useState(null)
  const [activeFilterCount, setActiveFilterCount] = useState(0)
  const [recordView, setRecordView] = useState(null)

  useEffect(() => {
    const syncUtilityPage = (event) => setUtilityPage(event.detail?.page ?? null)
    const syncFilterSubpage = (event) => setFilterSubpage(event.detail?.page ?? null)
    const syncRecordView = (event) => setRecordView(event.detail?.kind ?? null)
    window.addEventListener('workbench:work-orders-utility-page', syncUtilityPage)
    window.addEventListener('workbench:work-orders-filter-subpage', syncFilterSubpage)
    window.addEventListener('workbench:work-orders-record-view', syncRecordView)
    return () => {
      window.removeEventListener('workbench:work-orders-utility-page', syncUtilityPage)
      window.removeEventListener('workbench:work-orders-filter-subpage', syncFilterSubpage)
      window.removeEventListener('workbench:work-orders-record-view', syncRecordView)
    }
  }, [])

  useLayoutEffect(() => {
    const syncActiveFilterCount = (event) => {
      const count = Number(event.detail?.count)
      setActiveFilterCount(Number.isFinite(count) ? Math.max(0, count) : 0)
    }
    window.addEventListener('workbench:work-orders-active-filter-count', syncActiveFilterCount)
    return () => window.removeEventListener('workbench:work-orders-active-filter-count', syncActiveFilterCount)
  }, [])

  const openFilters = () => {
    setUtilityPage('filters')
    window.dispatchEvent(new CustomEvent('workbench:work-orders-utility-page', {
      detail: { page: 'filters', resetDraft: true },
    }))
  }

  const goBack = () => {
    if (utilityPage === 'sort') {
      setUtilityPage('filters')
      window.dispatchEvent(new CustomEvent('workbench:work-orders-utility-page', { detail: { page: 'filters' } }))
    } else if (filterSubpage) {
      window.dispatchEvent(new CustomEvent('workbench:work-orders-filter-subpage-back'))
    } else {
      setUtilityPage(null)
      window.dispatchEvent(new CustomEvent('workbench:work-orders-utility-page', { detail: { page: null } }))
    }
  }

  const finishSort = () => {
    setUtilityPage(null)
    window.dispatchEvent(new CustomEvent('workbench:work-orders-utility-page', {
      detail: { page: null, action: 'done' },
    }))
  }

  const reset = () => {
    setUtilityPage(null)
    setFilterSubpage(null)
    setRecordView(null)
  }

  return {
    utilityPage,
    filterSubpage,
    activeFilterCount,
    recordView,
    openFilters,
    goBack,
    finishSort,
    reset,
  }
}
