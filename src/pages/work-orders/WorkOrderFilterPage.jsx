import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, CircleAlert, Clock3, List, MapPin, Plus, Search, SlidersHorizontal, Trash2, UserRound, WandSparkles, X } from 'lucide-react'
import { normalizeWorkOrderFilters } from '../../utils/workOrderFilters'
import { workOrderFilterDefinitions } from './workOrderFilterOptions'
import './WorkOrderFilterPage.css'

const PRIMARY_FIELDS = ['assigned_to', 'due_date', 'priority']
const MORE_FIELDS = ['status', 'start_date', 'work_type']
const PAGE_SIZES = [10, 25, 50]
const PAGE_FIELD_LABELS = { assigned_to: 'Assigned to', due_date: 'Due Date', start_date: 'Start Date', work_type: 'Work Type' }

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
  onApply,
}) {
  const [screen, setScreen] = useState({ type: 'filters' })
  const [search, setSearch] = useState('')
  const [moreExpanded, setMoreExpanded] = useState(false)
  const [savedScope, setSavedScope] = useState('personal')
  const [fieldSearch, setFieldSearch] = useState('')
  const [dateDraft, setDateDraft] = useState(['', ''])
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
    if (field === 'due_date' || field === 'start_date') setDateDraft([current?.values[0] ?? '', current?.values[1] ?? ''])
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
    const operator = active?.operator ?? definition.defaultOperator
    const values = active?.values ?? []
    const isDate = field === 'due_date' || field === 'start_date'
    const isEmptyOperator = operator === 'is_empty' || operator === 'is_not_empty'
    const updateOperator = (nextOperator) => {
      if (nextOperator === 'is_empty' || nextOperator === 'is_not_empty') {
        setFilter(field, nextOperator, [])
      } else if (isDate) {
        setDateDraft([values[0] ?? '', nextOperator === 'between' ? values[1] ?? '' : ''])
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
    const options = field === 'assigned_to' ? assigneeOptions : definition.options ?? []

    return <section className="work-order-filter-page-editor" aria-label={`${fieldLabel(field)} options`}>
      <label className="work-order-filter-page-control-label" htmlFor={`work-order-filter-operator-${field}`}>Condition</label>
      <select id={`work-order-filter-operator-${field}`} value={operator} onChange={(event) => updateOperator(event.target.value)}>
        {definition.operators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {isDate && !isEmptyOperator && <div className="work-order-filter-page-date-fields">
        <label>{operator === 'between' ? 'Start date' : fieldLabel(field)}
          <input type="date" value={values[0] ?? ''} onChange={(event) => updateDate(0, event.target.value)} />
        </label>
        {operator === 'between' && <label>End date
          <input type="date" value={values[1] ?? ''} min={values[0] || undefined} onChange={(event) => updateDate(1, event.target.value)} />
        </label>}
      </div>}
      {!isDate && !isEmptyOperator && <div className="work-order-filter-page-values">
        {field === 'assigned_to' && <FilterSearchField value={fieldSearch} onChange={setFieldSearch} placeholder="Search people and teams" ariaLabel="Search people and teams" />}
        {options.filter((option) => option.label.toLocaleLowerCase().includes(field === 'assigned_to' ? fieldSearch.trim().toLocaleLowerCase() : '')).map((option) => <label className="work-order-filter-page-value" key={option.value}>
          <span>{option.label}</span>
          <input type="checkbox" checked={values.includes(option.value)} onChange={() => toggleValue(field, option.value)} />
        </label>)}
        {field === 'assigned_to' && options.filter((option) => option.label.toLocaleLowerCase().includes(fieldSearch.trim().toLocaleLowerCase())).length === 0 && <p className="work-order-filter-page-empty">No people or teams available.</p>}
      </div>}
    </section>
  }

  if (screen.type === 'field') {
    return <div className="work-order-filter-page">
      <header className="work-order-filter-page-titlebar"><span /><h1>{fieldLabel(screen.field)}</h1><span /></header>
      <main className="work-order-filter-page-detail">{renderFieldEditor(screen.field)}</main>
      <footer className="work-order-filter-page-footer"><button type="button" onClick={goBack}>Done</button></footer>
    </div>
  }

  if (screen.type === 'saved') {
    return <div className="work-order-filter-page">
      <header className="work-order-filter-page-titlebar"><span /><h1>My Filters</h1><span /></header>
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
    return <div className="work-order-filter-page">
      <header className="work-order-filter-page-titlebar"><span /><h1>Results per page</h1><span /></header>
      <main className="work-order-filter-page-detail" role="radiogroup" aria-label="Results per page">
        {PAGE_SIZES.map((size) => <label className="work-order-filter-page-value" key={size}><span>{size}</span><input type="radio" name="work-order-page-size" checked={pageSize === size} onChange={() => onPageSizeChange(size)} /></label>)}
        <p className="work-order-filter-page-empty">The inbox supports up to 50 results per page.</p>
      </main>
      <footer className="work-order-filter-page-footer"><button type="button" onClick={goBack}>Done</button></footer>
    </div>
  }

  return <div className="work-order-filter-page">
    <header className="work-order-filter-page-titlebar"><span /><h1>Add Filter</h1><span /></header>
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
