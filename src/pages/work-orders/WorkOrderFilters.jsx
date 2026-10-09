import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar } from '../../components/ui/Avatar'
import {
  ChevronDown,
  Plus,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { normalizeWorkOrderFilters } from '../../utils/workOrderFilters'
import { WorkOrderSavedFilters } from './WorkOrderSavedFilters'
import { workOrderFilterDefinitions, selectableWorkOrderFilterFields } from './workOrderFilterOptions'
import './WorkOrderFilters.css'

function operatorLabel(field, operator) {
  return workOrderFilterDefinitions[field]?.operators.find(([value]) => value === operator)?.[1] ?? 'One of'
}

function filterCount(filter) {
  if (!filter) return ''
  if (filter.field === 'due_date' || filter.field === 'start_date') return ''
  return filter.values.length || (filter.operator === 'is_empty' || filter.operator === 'is_not_empty' ? '1' : '')
}

function calendarValues(operator, values) {
  const count = operator === 'between' ? 2 : 1
  return Array.from({ length: count }, (_, index) => values[index] ?? '')
}

export function WorkOrderFilters({
  filters = [],
  onFiltersChange = () => {},
  assigneeOptions = [],
  savedFilters = [],
  savedFiltersLoading = false,
  savedFiltersError = '',
  savedFiltersLoaded = false,
  canSavePersonalFilters = false,
  canManageOrganizationFilters = false,
  userId,
  activeSavedFilterId = null,
  onLoadSavedFilters,
  onApplySavedFilter,
  onCreateSavedFilter,
  onUpdateSavedFilter,
  onDeleteSavedFilter,
}) {
  const normalizedFilters = normalizeWorkOrderFilters(filters)
  const filterId = useId()
  const [activeField, setActiveField] = useState(null)
  const [operatorDraft, setOperatorDraft] = useState('one_of')
  const [operatorMenuOpen, setOperatorMenuOpen] = useState(false)
  const [dateDraft, setDateDraft] = useState(['', ''])
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [menuPosition, setMenuPosition] = useState(null)
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const operatorSettingsRef = useRef(null)
  const operatorTriggerRef = useRef(null)
  const triggerRefs = useRef(new Map())

  const filterByField = new Map(normalizedFilters.map((filter) => [filter.field, filter]))
  const activeFilter = activeField ? filterByField.get(activeField) : null
  const activeDefinition = activeField ? workOrderFilterDefinitions[activeField] : null

  const changeFilter = (field, operator, values) => {
    const next = normalizeWorkOrderFilters([
      ...normalizedFilters.filter((filter) => filter.field !== field),
      { field, operator, values },
    ])
    onFiltersChange(next)
  }

  const clearFilter = (field) => {
    onFiltersChange(normalizedFilters.filter((filter) => filter.field !== field))
    if (activeField === field) {
      triggerRefs.current.get(field)?.focus()
      setOperatorMenuOpen(false)
      setActiveField(null)
    }
  }

  const openField = (field) => {
    const definition = workOrderFilterDefinitions[field]
    const current = filterByField.get(field)
    setOperatorDraft(current?.operator ?? definition.defaultOperator)
    setOperatorMenuOpen(false)
    setDateDraft(calendarValues(current?.operator ?? definition.defaultOperator, current?.values ?? []))
    setAssignmentSearch('')
    setActiveField(field)
  }

  useLayoutEffect(() => {
    if (!activeField || !menuRef.current) return undefined
    const updatePosition = () => {
      const trigger = triggerRefs.current.get(activeField === 'add' ? 'add' : activeField)
      if (!trigger || !menuRef.current) return
      const triggerRect = trigger.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()
      const gutter = 8
      const below = window.innerHeight - triggerRect.bottom - gutter
      const above = triggerRect.top - gutter
      const naturalHeight = menuRef.current.scrollHeight
      const openUp = naturalHeight > below && above > below
      const availableHeight = Math.max(120, openUp ? above : below)
      const height = Math.min(naturalHeight, availableHeight, window.innerHeight - gutter * 2)
      const width = Math.min(menuRect.width || 320, window.innerWidth - gutter * 2)
      const left = Math.min(Math.max(gutter, triggerRect.left), window.innerWidth - width - gutter)
      const top = openUp
        ? Math.max(gutter, triggerRect.top - gutter - height)
        : Math.min(triggerRect.bottom + gutter, window.innerHeight - height - gutter)
      setMenuPosition({ top, left, maxHeight: availableHeight })
    }
    updatePosition()
    document.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      document.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [activeField, assigneeOptions.length, normalizedFilters.length])

  useEffect(() => {
    if (!activeField) return undefined
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOperatorMenuOpen(false)
        setActiveField(null)
      } else if (operatorMenuOpen && !operatorSettingsRef.current?.contains(event.target)) {
        setOperatorMenuOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (operatorMenuOpen) {
        setOperatorMenuOpen(false)
        operatorTriggerRef.current?.focus()
        return
      }
      triggerRefs.current.get(activeField === 'add' ? 'add' : activeField)?.focus()
      setActiveField(null)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeField, operatorMenuOpen])

  useEffect(() => {
    if (!activeField || !menuRef.current) return undefined
    const firstControl = menuRef.current.querySelector('.work-order-filter-operator-trigger, input:not([type="checkbox"]), button')
    firstControl?.focus()
    return undefined
  }, [activeField])

  const renderFilterChip = (field) => {
    const definition = workOrderFilterDefinitions[field]
    const Icon = definition.Icon
    const filter = filterByField.get(field)
    const count = filterCount(filter)
    return (
      <div key={field} className="work-order-filter-button-wrap">
        <button
          ref={(node) => { if (node) triggerRefs.current.set(field, node); else triggerRefs.current.delete(field) }}
          type="button"
          className={`filter-button work-order-filter-chip${filter ? ' is-active' : ''}`}
          aria-label={`${definition.label}${filter ? ` filter, ${operatorLabel(field, filter.operator)}${count ? `, ${count} selected` : ''}` : ' filter'}`}
          aria-expanded={activeField === field}
          onClick={() => activeField === field ? setActiveField(null) : openField(field)}
        >
          <Icon className="work-order-filter-icon" size={14} aria-hidden="true" />
          <span className="work-order-filter-label">{definition.label}</span>
          {count && <span className="work-order-filter-count"><span className="work-order-filter-count-badge">{count}</span></span>}
        </button>
      </div>
    )
  }

  const selectedValues = activeFilter?.values ?? []
  const selectedOperator = operatorDraft
  const hasEmptyOperator = selectedOperator === 'is_empty' || selectedOperator === 'is_not_empty'
  const isDateFilter = activeField === 'due_date' || activeField === 'start_date'
  const filteredAssignees = assigneeOptions.filter((option) => option.label.toLowerCase().includes(assignmentSearch.trim().toLowerCase()))
  const teamOptions = filteredAssignees.filter((option) => option.value.startsWith('team:'))
  const userOptions = filteredAssignees.filter((option) => option.value.startsWith('user:'))

  const toggleValue = (value) => {
    const values = selectedValues.includes(value)
      ? selectedValues.filter((selected) => selected !== value)
      : [...selectedValues, value]
    changeFilter(activeField, operatorDraft, values)
  }

  const changeOperator = (operator) => {
    setOperatorDraft(operator)
    if (operator === 'is_empty' || operator === 'is_not_empty') {
      setDateDraft(['', ''])
      changeFilter(activeField, operator, [])
      return
    }
    if (isDateFilter) {
      const currentValues = activeFilter?.values ?? []
      const nextDateDraft = calendarValues(operator, currentValues)
      setDateDraft(nextDateDraft)
      const requiredCount = operator === 'between' ? 2 : 1
      if (nextDateDraft.slice(0, requiredCount).every(Boolean)) {
        changeFilter(activeField, operator, nextDateDraft.slice(0, requiredCount))
      } else if (activeFilter) {
        onFiltersChange(normalizedFilters.filter((filter) => filter.field !== activeField))
      }
      return
    }
    if (selectedValues.length > 0) changeFilter(activeField, operator, selectedValues)
  }

  const selectOperator = (operator) => {
    changeOperator(operator)
    setOperatorMenuOpen(false)
    operatorTriggerRef.current?.focus()
  }

  const updateDate = (index, value) => {
    const nextValues = [...dateDraft]
    nextValues[index] = value
    setDateDraft(nextValues)
    const requiredCount = operatorDraft === 'between' ? 2 : 1
    if (nextValues.slice(0, requiredCount).every(Boolean)) changeFilter(activeField, operatorDraft, nextValues.slice(0, requiredCount))
  }

  return (
    <div className="work-order-actions" ref={rootRef} role="group" aria-label="Work Order filters">
      {renderFilterChip('assigned_to')}
      {renderFilterChip('status')}
      {selectableWorkOrderFilterFields.filter((field) => filterByField.has(field)).map(renderFilterChip)}
      <div className="work-order-filter-button-wrap">
        <button
          ref={(node) => { if (node) triggerRefs.current.set('add', node); else triggerRefs.current.delete('add') }}
          type="button"
          className={`filter-button work-order-filter-add${activeField === 'add' ? ' is-active' : ''}`}
          aria-expanded={activeField === 'add'}
          onClick={() => setActiveField(activeField === 'add' ? null : 'add')}
        >
          <Plus className="work-order-filter-icon" size={14} aria-hidden="true" /> <span className="work-order-filter-label">Add filter</span>
        </button>
      </div>
      {normalizedFilters.length > 0 && (
        <button type="button" className="work-order-filter-clear" onClick={() => { onFiltersChange([]); setActiveField(null); triggerRefs.current.get('add')?.focus() }}>
          Clear filters
        </button>
      )}
      <WorkOrderSavedFilters
        filters={normalizedFilters}
        savedFilters={savedFilters}
        loading={savedFiltersLoading}
        error={savedFiltersError}
        loaded={savedFiltersLoaded}
        canSave={canSavePersonalFilters}
        canManageOrganization={canManageOrganizationFilters}
        userId={userId}
        activeSavedFilterId={activeSavedFilterId}
        onBeforeOpen={() => setActiveField(null)}
        onLoad={onLoadSavedFilters}
        onApply={onApplySavedFilter}
        onCreate={onCreateSavedFilter}
        onUpdate={onUpdateSavedFilter}
        onDelete={onDeleteSavedFilter}
      />
      {activeField && createPortal(
        <div className="work-order-filter-portal" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveField(null) }}>
          <div
            ref={menuRef}
            className={`work-order-filter-popover${activeField === 'add' ? ' is-add-menu' : ''}`}
            role="dialog"
            aria-label={activeField === 'add' ? 'Add Work Order filter' : `${activeDefinition.label} filter`}
            style={{
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              maxHeight: menuPosition?.maxHeight ?? 'calc(100vh - 16px)',
              visibility: menuPosition ? 'visible' : 'hidden',
            }}
          >
          {activeField === 'add'
            ? <div className="work-order-filter-add-options">
                {selectableWorkOrderFilterFields.filter((field) => !filterByField.has(field)).map((field) => {
                  const { Icon, label } = workOrderFilterDefinitions[field]
                  return <button type="button" key={field} onClick={() => openField(field)}><Icon size={15} aria-hidden="true" />{label}</button>
                })}
                {selectableWorkOrderFilterFields.every((field) => filterByField.has(field)) && <p>All available filters are already added.</p>}
              </div>
            : <>
                <header className="work-order-filter-popover-header">
                  <div className="work-order-filter-header-start">
                    <div className="work-order-filter-menu-header">
                      <p className="work-order-filter-popover-title">{activeDefinition.label}</p>
                      <div className="work-order-filter-operator-settings" ref={operatorSettingsRef}>
                        <button
                          ref={operatorTriggerRef}
                          className={`work-order-filter-operator-trigger${operatorMenuOpen ? ' is-open' : ''}`}
                          type="button"
                          aria-label={`${activeDefinition.label} operator: ${operatorLabel(activeField, operatorDraft)}`}
                          aria-expanded={operatorMenuOpen}
                          aria-controls="work-order-filter-operator-menu"
                          onClick={() => setOperatorMenuOpen((open) => !open)}
                        >
                          <span className="work-order-filter-operator-label">{operatorLabel(activeField, operatorDraft)}</span>
                          <ChevronDown size={14} aria-hidden="true" />
                        </button>
                        {operatorMenuOpen && <div id="work-order-filter-operator-menu" className="work-order-filter-operator-menu" role="group" aria-label={`${activeDefinition.label} operators`}>
                          {activeDefinition.operators.map(([value, label]) => <button
                            key={value}
                            className="work-order-filter-operator-option"
                            type="button"
                            aria-pressed={operatorDraft === value}
                            onClick={() => selectOperator(value)}
                          >{label}</button>)}
                        </div>}
                      </div>
                    </div>
                  </div>
                  {activeFilter && <button className="work-order-filter-clear-button" type="button" aria-label={`Clear ${activeDefinition.label} filter`} onClick={() => clearFilter(activeField)}><Trash2 size={16} aria-hidden="true" /></button>}
                </header>
                <div className={`work-order-filter-popover-body${activeField === 'assigned_to' ? ' is-assignees' : ''}`}>
                {activeField === 'assigned_to' && !hasEmptyOperator && <>
                  <label className="work-order-filter-search"><span className="work-order-filter-sr-only">Search assignees</span><input type="search" placeholder="Search" value={assignmentSearch} onChange={(event) => setAssignmentSearch(event.target.value)} /></label>
                  <div className="work-order-filter-options is-assignees">
                    {teamOptions.length > 0 && <div className="work-order-filter-option-group"><h3>Teams</h3>{teamOptions.map((option) => {
                      const OptionIcon = option.icon ?? UsersRound
                      return <label key={option.value} className="work-order-filter-option">
                        <OptionIcon size={16} aria-hidden="true" />
                        <span className="work-order-filter-option-label">{option.label}</span><input type="checkbox" checked={selectedValues.includes(option.value)} onChange={() => toggleValue(option.value)} />
                      </label>
                    })}</div>}
                    {userOptions.length > 0 && <div className="work-order-filter-option-group"><h3>Users</h3>{userOptions.map((option) => <label key={option.value} className="work-order-filter-option">
                      <Avatar {...option.avatar} className="work-order-filter-option-avatar" /><span className="work-order-filter-option-label">{option.label}</span><input type="checkbox" checked={selectedValues.includes(option.value)} onChange={() => toggleValue(option.value)} />
                    </label>)}</div>}
                    {filteredAssignees.length === 0 && <p className="work-order-filter-empty">No matching assignees.</p>}
                  </div>
                </>}
                {activeDefinition.options && !hasEmptyOperator && <div className={`work-order-filter-options${activeField === 'priority' ? ' is-priority' : ''}`}>
                  {activeField === 'priority'
                    ? <div className="work-order-filter-option-section">
                        <div className="work-order-filter-option-list" role="group" aria-label="Priority options">
                          {activeDefinition.options.map((option) => {
                            const checkboxId = `${filterId}-priority-${option.value.toLowerCase()}`
                            const togglePriority = () => toggleValue(option.value)
                            return <div key={option.value} className="work-order-filter-option-row">
                              <div className="work-order-filter-option-spacer" />
                              {option.Icon && <div className="work-order-filter-option-media">
                                <span className={`work-order-filter-option-icon${option.iconTone ? ` work-order-filter-option-icon-${option.iconTone}` : ''}`} aria-hidden="true">
                                  <option.Icon size={16} />
                                </span>
                              </div>}
                              <div
                                aria-disabled="false"
                                className="work-order-filter-option-action"
                                role="menuitem"
                                tabIndex={0}
                                onClick={togglePriority}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    togglePriority()
                                  }
                                }}
                              >
                                <p className="work-order-filter-option-label" title={option.label}>{option.label}</p>
                              </div>
                              <div className="work-order-filter-option-trailing">
                                <div className="work-order-filter-option-trailing-container">
                                  <div className="work-order-filter-option-checkbox">
                                    <input id={checkboxId} type="checkbox" checked={selectedValues.includes(option.value)} onChange={togglePriority} />
                                    <label className="work-order-filter-sr-only" htmlFor={checkboxId}>{option.label}</label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          })}
                        </div>
                      </div>
                    : activeDefinition.options.map((option) => {
                        const OptionIcon = option.icon
                        return <label key={option.value} className={`work-order-filter-option${OptionIcon ? ' is-status' : ''}`}>
                          {OptionIcon && <span className={`work-order-filter-option-icon work-order-filter-status-icon ${option.tone}`} aria-hidden="true"><OptionIcon size={16} /></span>}
                          <span className="work-order-filter-option-label">{option.label}</span>
                          <input type="checkbox" checked={selectedValues.includes(option.value)} onChange={() => toggleValue(option.value)} />
                        </label>
                      })}
                </div>}
                {isDateFilter && !hasEmptyOperator && <div className="work-order-filter-date-inputs">
                  <label>{operatorDraft === 'between' ? 'Start date' : activeDefinition.label}
                    <input type="date" value={dateDraft[0]} onChange={(event) => updateDate(0, event.target.value)} />
                  </label>
                  {operatorDraft === 'between' && <label>End date
                    <input type="date" value={dateDraft[1]} min={dateDraft[0] || undefined} onChange={(event) => updateDate(1, event.target.value)} />
                  </label>}
                </div>}
                {activeField === 'assigned_to' && hasEmptyOperator && <p className="work-order-filter-hint">This filter matches Work Orders with {operatorDraft === 'is_empty' ? 'no assignee' : 'at least one assignee'}.</p>}
                {activeField === 'priority' && hasEmptyOperator && <p className="work-order-filter-hint">This filter matches Work Orders {operatorDraft === 'is_empty' ? 'without a priority' : 'with a priority'}.</p>}
                </div>
              </>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
