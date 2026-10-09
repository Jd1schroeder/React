import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleAlert, CircleDot, Clock3, List, MapPin, Plus, Search, SlidersHorizontal, Trash2, UserRound, WandSparkles, X } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { normalizeWorkOrderFilters } from '../../utils/workOrderFilters'
import { workOrderFilterDefinitions } from './workOrderFilterOptions'
import './WorkOrderFilterPage.css'

const PRIMARY_FIELDS = ['assigned_to', 'due_date', 'priority']
const MORE_FIELDS = ['status', 'start_date', 'work_type']
const PAGE_SIZES = [10, 25, 50]
const PAGE_FIELD_LABELS = { assigned_to: 'Assigned to', due_date: 'Due Date', start_date: 'Start Date', work_type: 'Work Type' }
const DATE_PRESETS = ['Today', 'Tomorrow', 'Next 7 Days', 'Next 30 Days', 'This Month', 'Overdue', 'Custom Date']

function dateKeyInTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function addCalendarDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function filterForDatePreset(preset, today) {
  const tomorrow = addCalendarDays(today, 1)
  if (preset === 'Today') return { operator: 'on', values: [today] }
  if (preset === 'Tomorrow') return { operator: 'on', values: [tomorrow] }
  if (preset === 'Next 7 Days') return { operator: 'between', values: [today, addCalendarDays(today, 6)] }
  if (preset === 'Next 30 Days') return { operator: 'between', values: [today, addCalendarDays(today, 29)] }
  if (preset === 'This Month') {
    const [year, month] = today.split('-').map(Number)
    const endOfMonth = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
    return { operator: 'between', values: [today, endOfMonth] }
  }
  if (preset === 'Overdue') return { operator: 'before', values: [today] }
  return { operator: 'on', values: [''] }
}

function selectedDatePreset(operator, values, today) {
  const tomorrow = addCalendarDays(today, 1)
  if (operator === 'on' && values[0] === today) return 'Today'
  if (operator === 'on' && values[0] === tomorrow) return 'Tomorrow'
  if (operator === 'between' && values[0] === today && values[1] === addCalendarDays(today, 6)) return 'Next 7 Days'
  if (operator === 'between' && values[0] === today && values[1] === addCalendarDays(today, 29)) return 'Next 30 Days'
  if (operator === 'between') {
    const [year, month] = today.split('-').map(Number)
    const endOfMonth = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
    if (values[0] === today && values[1] === endOfMonth) return 'This Month'
  }
  if (operator === 'before' && values[0] === today) return 'Overdue'
  if (operator === 'on' && values[0]) return 'Custom Date'
  return ''
}

function showNativeDatePicker(input) {
  if (!input) return
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }
  } catch {
    // Fall back to the input's native click behavior if showPicker is unavailable.
  }
  input.focus()
  input.click()
}

function openNativeDatePicker(event) {
  showNativeDatePicker(event.currentTarget.parentElement?.querySelector('input[type="date"]'))
}

function openPickerOutsideDateText(event) {
  const input = event.currentTarget
  const bounds = input.getBoundingClientRect()
  const clickX = event.clientX - bounds.left
  const textStart = Number.parseFloat(window.getComputedStyle(input).paddingLeft) || 40
  const dateTextWidth = 112
  if (clickX >= textStart - 2 && clickX <= textStart + dateTextWidth) return
  showNativeDatePicker(input)
}

function fieldLabel(field) {
  return PAGE_FIELD_LABELS[field] ?? workOrderFilterDefinitions[field]?.label
}

function fieldIcon(field) {
  if (field === 'assigned_to') return UserRound
  if (field === 'due_date' || field === 'start_date') return Clock3
  if (field === 'priority') return CircleAlert
  return workOrderFilterDefinitions[field]?.Icon ?? SlidersHorizontal
}

function FilterSearchField({ value, onChange, placeholder, ariaLabel, className = '' }) {
  return <div className={`work-order-filter-page-search${className ? ` ${className}` : ''}`}>
    <Search size={18} aria-hidden="true" />
    <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={ariaLabel} />
    {value && <button className="work-order-filter-page-search-clear" type="button" aria-label={`Clear ${ariaLabel}`} onClick={() => onChange('')}><X size={18} aria-hidden="true" /></button>}
  </div>
}

export function WorkOrderFilterPage({
  filters,
  onFiltersChange,
  assigneeOptions = [],
  savedFilters = [],
  savedFiltersLoading = false,
  savedFiltersError = '',
  savedFiltersLoaded = false,
  onLoadSavedFilters,
  onSelectSavedFilter,
  onOpenSort,
  pageSize = 50,
  onPageSizeChange,
  timezone,
  onBack,
  onApply,
}) {
  const [screen, setScreen] = useState({ type: 'filters' })
  const [search, setSearch] = useState('')
  const [moreExpanded, setMoreExpanded] = useState(false)
  const [savedScope, setSavedScope] = useState('personal')
  const [fieldSearch, setFieldSearch] = useState('')
  const [dateDraft, setDateDraft] = useState(['', ''])
  const [dateOperatorDraft, setDateOperatorDraft] = useState('')
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('workbench:work-orders-filter-subpage', {
      detail: { page: screen.type === 'filters' ? null : screen.type },
    }))
  }, [screen.type])
  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent('workbench:work-orders-filter-subpage', { detail: { page: null } }))
  }, [])
  const normalizedFilters = normalizeWorkOrderFilters(filters)
  const activeByField = new Map(normalizedFilters.map((filter) => [filter.field, filter]))
  const query = search.trim().toLocaleLowerCase()
  const filteredFields = (fields) => fields.filter((field) => fieldLabel(field)?.toLocaleLowerCase().includes(query))
  const showSort = !query || 'sort by'.includes(query)
  const showSaved = !query || 'my filters'.includes(query)
  const showLocation = !query || 'location'.includes(query)
  const showMore = !query || 'more filters'.includes(query)
  const matchedMoreFields = filteredFields(MORE_FIELDS)
  const hasSearchResults = showSort || showSaved || showLocation || showMore || filteredFields(PRIMARY_FIELDS).length > 0 || matchedMoreFields.length > 0
  const visibleSavedFilters = useMemo(() => savedFilters
    .filter((item) => item.filter_scope === savedScope)
    .filter((item) => item.name.toLocaleLowerCase().includes(fieldSearch.trim().toLocaleLowerCase())), [fieldSearch, savedFilters, savedScope])

  const setFilter = (field, operator, values) => {
    onFiltersChange(normalizeWorkOrderFilters([
      ...normalizedFilters.filter((filter) => filter.field !== field),
      { field, operator, values },
    ]))
  }
  const toggleValue = (field, value) => {
    const current = activeByField.get(field)
    const values = current?.values.includes(value)
      ? current.values.filter((item) => item !== value)
      : [...(current?.values ?? []), value]
    if (!values.length) {
      onFiltersChange(normalizedFilters.filter((filter) => filter.field !== field))
      return
    }
    setFilter(field, current?.operator ?? workOrderFilterDefinitions[field].defaultOperator, values)
  }
  const openField = (field) => {
    const current = activeByField.get(field)
    if (field === 'due_date' || field === 'start_date') {
      setDateDraft([current?.values[0] ?? '', current?.values[1] ?? ''])
      setDateOperatorDraft(current?.operator ?? workOrderFilterDefinitions[field].defaultOperator)
    }
    if (field === 'assigned_to') setFieldSearch('')
    setScreen({ type: 'field', field })
  }
  const goBack = () => {
    if (screen.type === 'filters') return
    if (screen.type === 'field' || screen.type === 'saved' || screen.type === 'page-size') {
      setScreen({ type: 'filters' })
      return
    }
    setScreen({ type: 'filters' })
  }
  const renderTitlebar = (title, { onBack: handleBack = goBack, backLabel = 'Back to Add Filter', showBackText = true } = {}) => <header className="work-order-filter-page-titlebar has-back">
    <button className="work-order-filter-page-back" type="button" aria-label={backLabel} onClick={handleBack}>
      <ChevronLeft size={22} aria-hidden="true" />
      {showBackText && <span>Back</span>}
    </button>
    <h1>{title}</h1>
    <span />
  </header>
  useEffect(() => {
    if (screen.type === 'filters') return undefined
    const returnToFilters = () => setScreen({ type: 'filters' })
    window.addEventListener('workbench:work-orders-filter-subpage-back', returnToFilters)
    return () => window.removeEventListener('workbench:work-orders-filter-subpage-back', returnToFilters)
  }, [screen.type])

  const renderFieldRow = (field) => {
    const Icon = fieldIcon(field)
    const selected = activeByField.get(field)
    return <button className={`work-order-filter-page-row${selected ? ' is-selected' : ''}`} key={field} type="button" onClick={() => openField(field)}>
      <Icon size={20} aria-hidden="true" />
      <span>{fieldLabel(field)}</span>
      <ChevronRight className="work-order-filter-page-chevron" size={20} aria-hidden="true" />
    </button>
  }

  const renderFieldEditor = (field) => {
    const definition = workOrderFilterDefinitions[field]
    const active = activeByField.get(field)
    const isDate = field === 'due_date' || field === 'start_date'
    const operator = active?.operator ?? (isDate ? dateOperatorDraft || definition.defaultOperator : definition.defaultOperator)
    const values = active?.values ?? []
    const isEmptyOperator = operator === 'is_empty' || operator === 'is_not_empty'
    const updateOperator = (nextOperator) => {
      if (isDate) setDateOperatorDraft(nextOperator)
      if (nextOperator === 'is_empty' || nextOperator === 'is_not_empty') {
        setDateDraft(['', ''])
        setFilter(field, nextOperator, [])
      } else if (isDate) {
        const nextDateDraft = [values[0] ?? '', nextOperator === 'between' ? values[1] ?? '' : '']
        setDateDraft(nextDateDraft)
        onFiltersChange(normalizedFilters.filter((filter) => filter.field !== field))
      } else if (values.length) {
        setFilter(field, nextOperator, values)
      } else {
        onFiltersChange(normalizedFilters.filter((filter) => filter.field !== field))
      }
    }
    const updateDate = (index, value) => {
      const nextValues = [...dateDraft]
      nextValues[index] = value
      setDateDraft(nextValues)
      const required = operator === 'between' ? 2 : 1
      if (nextValues.slice(0, required).every(Boolean)) setFilter(field, operator, nextValues.slice(0, required))
      else onFiltersChange(normalizedFilters.filter((filter) => filter.field !== field))
    }
    const selectDatePreset = (preset) => {
      const selected = filterForDatePreset(preset, dateKeyInTimezone(new Date(), timezone))
      setDateOperatorDraft(selected.operator)
      setDateDraft(selected.values)
      if (selected.values.every(Boolean)) setFilter(field, selected.operator, selected.values)
      else onFiltersChange(normalizedFilters.filter((filter) => filter.field !== field))
    }
    const options = field === 'assigned_to' ? assigneeOptions : definition.options ?? []
    const selectedPreset = isDate
      ? selectedDatePreset(operator, values.length ? values : dateDraft, dateKeyInTimezone(new Date(), timezone))
      : ''
    const showDateFields = isDate && !isEmptyOperator && !(selectedPreset && selectedPreset !== 'Custom Date')

    return <section className="work-order-filter-page-editor" aria-label={`${fieldLabel(field)} options`}>
      <div className="work-order-filter-page-condition">
        <label className="work-order-filter-page-control-label" htmlFor={`work-order-filter-condition-${field}`}>Condition</label>
        <select
          id={`work-order-filter-condition-${field}`}
          className="work-order-filter-page-condition-select"
          aria-label="Condition"
          value={operator}
          onChange={(event) => updateOperator(event.target.value)}
        >
          {definition.operators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {isDate && <div className="work-order-filter-page-date-presets" role="group" aria-label={`Quick ${fieldLabel(field).toLocaleLowerCase()} options`}>
          {DATE_PRESETS.map((preset) => <button
            className="work-order-filter-page-date-preset"
            key={preset}
            type="button"
            aria-pressed={selectedPreset === preset}
            onClick={() => selectDatePreset(preset)}
          ><span className="work-order-filter-page-date-preset-label">{preset === 'Custom Date' && <CalendarDays size={17} aria-hidden="true" />}{preset}</span><span className={`work-order-filter-page-date-preset-check${selectedPreset === preset ? ' is-checked' : ''}`} aria-hidden="true">{selectedPreset === preset && <Check size={14} />}</span></button>)}
      </div>}
      {showDateFields && <div className="work-order-filter-page-date-fields">
        <label>{operator === 'between' ? 'Start date' : fieldLabel(field)}
          <span className="work-order-filter-page-date-input">
            <button className="work-order-filter-page-date-picker-trigger" type="button" aria-label={`Open ${operator === 'between' ? 'Start date' : fieldLabel(field)} picker`} onClick={openNativeDatePicker}><CalendarDays size={18} aria-hidden="true" /></button>
            <input type="date" value={dateDraft[0] ?? ''} onClick={openPickerOutsideDateText} onChange={(event) => updateDate(0, event.target.value)} />
          </span>
        </label>
        {operator === 'between' && <label>End date
          <span className="work-order-filter-page-date-input">
            <button className="work-order-filter-page-date-picker-trigger" type="button" aria-label="Open End date picker" onClick={openNativeDatePicker}><CalendarDays size={18} aria-hidden="true" /></button>
            <input type="date" value={dateDraft[1] ?? ''} min={dateDraft[0] || undefined} onClick={openPickerOutsideDateText} onChange={(event) => updateDate(1, event.target.value)} />
          </span>
        </label>}
      </div>}
      {!isDate && !isEmptyOperator && <div className="work-order-filter-page-values">
        {field === 'assigned_to' && <FilterSearchField value={fieldSearch} onChange={setFieldSearch} placeholder="Search people and teams" ariaLabel="Search people and teams" />}
        {options.filter((option) => option.label.toLocaleLowerCase().includes(field === 'assigned_to' ? fieldSearch.trim().toLocaleLowerCase() : '')).map((option) => {
          const PriorityIcon = option.Icon ?? (option.value === 'None' ? CircleDot : null)
          const priorityTone = option.iconTone ?? 'none'
          const AssigneeIcon = option.icon
          return <label className={`work-order-filter-page-value${field === 'priority' ? ' is-priority' : ''}`} key={option.value}>
            <span className="work-order-filter-page-value-label">
              {field === 'assigned_to' && option.avatar && <span aria-hidden="true"><Avatar className="work-order-filter-page-assignee-avatar" {...option.avatar} alt="" /></span>}
              {field === 'assigned_to' && AssigneeIcon && <AssigneeIcon className="work-order-filter-page-assignee-team-icon" size={18} aria-hidden="true" />}
              {field === 'priority' && PriorityIcon && <PriorityIcon className={`work-order-filter-page-priority-icon is-${priorityTone}`} size={18} aria-hidden="true" />}
              <span>{option.label}</span>
            </span>
            <input type="checkbox" checked={values.includes(option.value)} onChange={() => toggleValue(field, option.value)} />
          </label>
        })}
        {field === 'assigned_to' && options.filter((option) => option.label.toLocaleLowerCase().includes(fieldSearch.trim().toLocaleLowerCase())).length === 0 && <p className="work-order-filter-page-empty">No people or teams available.</p>}
      </div>}
    </section>
  }

  if (screen.type === 'field') {
    return <div className="work-order-filter-page" key={screen.type}>
      {renderTitlebar(fieldLabel(screen.field))}
      <main className="work-order-filter-page-detail">{renderFieldEditor(screen.field)}</main>
      <footer className="work-order-filter-page-footer"><button type="button" onClick={goBack}>Done</button></footer>
    </div>
  }

  if (screen.type === 'saved') {
    return <div className="work-order-filter-page" key={screen.type}>
      {renderTitlebar('My Filters')}
      <main className="work-order-filter-page-detail">
        <FilterSearchField value={fieldSearch} onChange={setFieldSearch} placeholder="Search saved filters" ariaLabel="Search saved filters" />
        <div className="work-order-filter-page-saved-tabs" role="tablist" aria-label="Saved filter scope">
          {['personal', 'organization'].map((scope) => <button key={scope} type="button" role="tab" aria-selected={savedScope === scope} className={savedScope === scope ? 'is-active' : ''} onClick={() => setSavedScope(scope)}>{scope === 'personal' ? 'Personal' : 'Organization'}</button>)}
        </div>
        {savedFiltersLoading && <p role="status" className="work-order-filter-page-empty">Loading saved filters…</p>}
        {!savedFiltersLoading && savedFiltersError && <p role="alert" className="work-order-filter-page-empty">{savedFiltersError}<button type="button" onClick={() => void onLoadSavedFilters?.()}>Try again</button></p>}
        {!savedFiltersLoading && !savedFiltersError && visibleSavedFilters.map((item) => <button type="button" className="work-order-filter-page-saved-item" key={item.id} onClick={() => { onSelectSavedFilter(item); setScreen({ type: 'filters' }) }}><span>{item.name}</span><ChevronRight size={18} aria-hidden="true" /></button>)}
        {savedFiltersLoaded && !savedFiltersLoading && !savedFiltersError && visibleSavedFilters.length === 0 && <p className="work-order-filter-page-empty">No saved filters here yet.</p>}
      </main>
    </div>
  }

  if (screen.type === 'page-size') {
    return <div className="work-order-filter-page" key={screen.type}>
      {renderTitlebar('Results per page')}
      <main className="work-order-filter-page-detail" role="radiogroup" aria-label="Results per page">
        {PAGE_SIZES.map((size) => <label className="work-order-filter-page-value" key={size}><span>{size}</span><input type="radio" name="work-order-page-size" checked={pageSize === size} onChange={() => onPageSizeChange(size)} /></label>)}
        <p className="work-order-filter-page-empty">The inbox supports up to 50 results per page.</p>
      </main>
      <footer className="work-order-filter-page-footer"><button type="button" onClick={goBack}>Done</button></footer>
    </div>
  }

  return <div className="work-order-filter-page" key={screen.type}>
    {renderTitlebar('Add Filter', { onBack, backLabel: 'Back to Work Orders', showBackText: false })}
    <FilterSearchField value={search} onChange={setSearch} placeholder="Filter by..." ariaLabel="Filter by" className="work-order-filter-page-search-main" />
    <main className="work-order-filter-page-main">
      {showSort && <button className="work-order-filter-page-row work-order-filter-page-sort" type="button" onClick={onOpenSort}><List size={20} aria-hidden="true" /><span>Sort by</span><ChevronRight className="work-order-filter-page-chevron" size={20} aria-hidden="true" /></button>}
      <section className="work-order-filter-page-card">
        {showSaved && <button className="work-order-filter-page-row" type="button" onClick={() => { setScreen({ type: 'saved' }); setFieldSearch(''); if (!savedFiltersLoaded && !savedFiltersLoading) void onLoadSavedFilters?.() }}><WandSparkles size={20} aria-hidden="true" /><span>My Filters</span><ChevronRight className="work-order-filter-page-chevron" size={20} aria-hidden="true" /></button>}
        {filteredFields(PRIMARY_FIELDS).map(renderFieldRow)}
        {showLocation && <button className="work-order-filter-page-row is-muted" type="button" disabled aria-label="Location filter, coming soon"><MapPin size={20} aria-hidden="true" /><span>Location <small>Coming soon</small></span><ChevronRight className="work-order-filter-page-chevron" size={20} aria-hidden="true" /></button>}
        {showMore && !moreExpanded && <button className="work-order-filter-page-row is-muted" type="button" onClick={() => setMoreExpanded(true)}><Plus size={20} aria-hidden="true" /><span>More Filters</span><ChevronRight className="work-order-filter-page-chevron" size={20} aria-hidden="true" /></button>}
        {moreExpanded && !query && filteredFields(MORE_FIELDS).map(renderFieldRow)}
        {query && matchedMoreFields.map(renderFieldRow)}
        {!hasSearchResults && query && <p className="work-order-filter-page-empty">No matching filters.</p>}
      </section>
      {(!query || 'results per page'.includes(query)) && <button className="work-order-filter-page-row work-order-filter-page-results" type="button" onClick={() => setScreen({ type: 'page-size' })}><span>Results per page</span><span className="work-order-filter-page-results-value">{pageSize}</span><ChevronRight className="work-order-filter-page-chevron" size={20} aria-hidden="true" /></button>}
    </main>
    <footer className={`work-order-filter-page-footer${normalizedFilters.length ? ' has-clear-action' : ''}`}>
      {normalizedFilters.length > 0 && <button className="work-order-filter-page-clear" type="button" onClick={() => onFiltersChange([])}><Trash2 size={18} aria-hidden="true" /><span>Clear Filters</span></button>}
      <button className="work-order-filter-page-apply" type="button" onClick={onApply}>Apply</button>
    </footer>
  </div>
}
