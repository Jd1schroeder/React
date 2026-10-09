import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { workOrderSortGroups } from './workOrderSortOptions'
import './WorkOrderSortPage.css'

function groupForSort(sortId) {
  return workOrderSortGroups.find((group) => group.options.some((option) => option.id === sortId))?.id ?? 'priority'
}

export function WorkOrderSortPage({ sortId, onSortChange, unreadFirst, onUnreadFirstChange, onBack, onDone }) {
  const [expandedGroup, setExpandedGroup] = useState(() => groupForSort(sortId))

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onBack()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  return <section className="work-order-sort-page" aria-labelledby="work-order-sort-title">
    <header className="work-order-sort-page-header">
      <button className="work-order-sort-page-back" type="button" onClick={onBack}>
        <ChevronLeft size={22} aria-hidden="true" />
        <span>Back</span>
      </button>
      <h1 id="work-order-sort-title">Sort by</h1>
      <button className="work-order-sort-page-done" type="button" onClick={onDone}>Done</button>
    </header>
    <main className="work-order-sort-page-content">
      <p className="work-order-sort-page-note">Sorting options have no effect in Calendar View</p>

      <section className="work-order-sort-unread-card" aria-label="Unread ordering">
        <span>Show Unread First</span>
        <button
          className="work-order-sort-switch"
          type="button"
          role="switch"
          aria-checked={unreadFirst}
          aria-label="Show Unread First"
          onClick={() => onUnreadFirstChange(!unreadFirst)}
        ><span aria-hidden="true" /></button>
      </section>

      <div className="work-order-sort-groups" aria-label="Work Order sort options">
        {workOrderSortGroups.map((group) => {
          const isExpanded = expandedGroup === group.id
          return <section className="work-order-sort-group" key={group.id}>
            <button
              className={`work-order-sort-group-heading${isExpanded ? ' is-expanded' : ''}`}
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setExpandedGroup((current) => current === group.id ? null : group.id)}
            >
              <ChevronRight size={20} aria-hidden="true" />
              <span>{group.label}</span>
            </button>
            <div
              className={`work-order-sort-options-clip${isExpanded ? ' is-expanded' : ''}`}
              aria-hidden={!isExpanded}
              inert={!isExpanded}
            >
              <div className="work-order-sort-options" role="radiogroup" aria-label={group.label}>
                {group.options.map((option) => {
                  const isSelected = sortId === option.id
                  return <label
                    className={`work-order-sort-option${isSelected ? ' is-selected' : ''}`}
                    key={option.id}
                  >
                    <span>{option.label}</span>
                    <input
                      className="work-order-sort-option-radio"
                      type="radio"
                      name="work-order-sort"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => onSortChange(option.id)}
                      aria-label={`${group.label}: ${option.label}`}
                    />
                    <span className="work-order-sort-option-indicator" aria-hidden="true">{isSelected ? '✓' : ''}</span>
                  </label>
                })}
              </div>
            </div>
          </section>
        })}
      </div>
    </main>
  </section>
}
