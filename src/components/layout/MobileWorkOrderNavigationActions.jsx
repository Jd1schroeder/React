import { CalendarDays, ChevronLeft, Filter } from 'lucide-react'

export function MobileWorkOrderNavigationActions({ activePage, navigation, position }) {
  if (activePage !== 'Work Orders') return null

  const { utilityPage, filterSubpage, activeFilterCount, recordView } = navigation

  if (position === 'leading') {
    if (recordView && !utilityPage) {
      return <button
        className="mobile-navigation-record-back"
        type="button"
        aria-label="Back"
        onClick={() => window.dispatchEvent(new CustomEvent('workbench:work-orders-record-back'))}
      ><ChevronLeft size={22} aria-hidden="true" /><span>Back</span></button>
    }

    if (!utilityPage && !recordView) {
      return <button
        className="mobile-navigation-work-order-action is-calendar"
        type="button"
        aria-label="Toggle Work Order calendar"
        title="Toggle Work Order calendar"
        onClick={() => window.dispatchEvent(new CustomEvent('workbench:work-orders-calendar-toggle'))}
      ><CalendarDays size={23} aria-hidden="true" /></button>
    }

    if (utilityPage) {
      const backLabel = utilityPage === 'sort'
        ? 'Back to filters'
        : filterSubpage ? 'Back to Add Filter' : 'Back to Work Orders'
      const showBackText = utilityPage === 'sort' || (utilityPage === 'filters' && filterSubpage)
      return <button
        className="mobile-navigation-sort-back"
        type="button"
        aria-label={backLabel}
        onClick={navigation.goBack}
      >
        <ChevronLeft size={22} aria-hidden="true" />
        {showBackText && <span key={`${utilityPage}-${filterSubpage ?? ''}`} className="mobile-navigation-back-label">Back</span>}
      </button>
    }

    return null
  }

  return <>
    {utilityPage === 'filters' && <span className="mobile-navigation-sort-end-spacer" aria-hidden="true" />}
    {recordView && !utilityPage && recordView !== 'detail' && <button
      className="mobile-navigation-record-submit"
      type="submit"
      form={`new-work-order-form-${recordView}`}
      aria-label={recordView === 'edit' ? 'Save Work Order' : 'Create Work Order'}
    >{recordView === 'edit' ? 'Save' : 'Create'}</button>}
    {!utilityPage && !recordView && <button
      className={`mobile-navigation-work-order-action is-filter${activeFilterCount ? ' has-active-filters' : ''}`}
      type="button"
      aria-label={activeFilterCount ? `Filter Work Orders, ${activeFilterCount} active` : 'Filter Work Orders'}
      onClick={navigation.openFilters}
    >
      <Filter size={23} aria-hidden="true" />
      {activeFilterCount > 0 && <span className="mobile-navigation-filter-badge" aria-hidden="true">{activeFilterCount > 99 ? '99+' : activeFilterCount}</span>}
    </button>}
    {utilityPage === 'sort' && <button className="mobile-navigation-sort-done" type="button" onClick={navigation.finishSort}>Done</button>}
  </>
}
