import { Plus, Search, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { PanelViewSelector } from './PanelViewSelector'
import './PanelLayout.css'

export function HeaderSearch({ value = '', onChange, placeholder = 'Search', ariaLabel = placeholder, className = '' }) {
  return <label className={`header-search ${className}`.trim()}>
    <Search size={16} aria-hidden="true" />
    <input value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} aria-label={ariaLabel} />
    {value && <button type="button" className="clear-search" onClick={() => onChange?.('')} aria-label="Clear search"><X size={15} /></button>}
  </label>
}

export function PanelLayout({
  title,
  activeView = 'panel',
  viewOptions,
  onViewChange,
  searchValue = '',
  onSearch,
  searchPlaceholder,
  actionLabel = 'New item',
  onAction,
  subnavigation,
  children,
  className = '',
  bodyClassName = '',
  showViewSelector = true,
  showHeaderSearch = true,
  searchLeadingAction,
  searchTrailingAction,
  showAction = true,
}) {
  return <div className={`panel-view-page ${className}`.trim()}>
    <div className="panel-navigation">
      <header className="panel-view-header">
        <div className="panel-view-title">
          <div className="panel-title-line">
            <h1>{title}</h1>
            {showViewSelector && <PanelViewSelector activeView={activeView} options={viewOptions} onViewChange={onViewChange} />}
          </div>
        </div>
        <div className="panel-view-header-actions">
          {showHeaderSearch && <div className={`header-search-controls${searchLeadingAction || searchTrailingAction ? ' has-search-actions' : ''}`}>
            {searchLeadingAction}
            <HeaderSearch value={searchValue} onChange={onSearch} placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}`} ariaLabel={searchPlaceholder ?? `Search ${title.toLowerCase()}`} />
            {searchTrailingAction}
          </div>}
          {showAction && <Button onClick={onAction}><Plus size={15} /> {actionLabel}</Button>}
        </div>
      </header>
    </div>
    <div className="panel-alert" aria-live="polite" />
    <div className="panel-subnavigation">
      <div className="panel-filter-row">{subnavigation}</div>
    </div>
    <div className="panel-main-panel">
      <div className="panel-content-section">
        <div className={`panel-view-body ${bodyClassName}`.trim()}>{children}</div>
      </div>
    </div>
  </div>
}
