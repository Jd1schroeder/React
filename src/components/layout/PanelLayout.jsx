import { Plus, Search, X } from 'lucide-react'
import { Button } from '../ui/Button'
import './PanelLayout.css'

export function PanelLayout({
  title,
  modeLabel = 'Panel View',
  modeIcon: ModeIcon,
  searchValue = '',
  onSearch,
  searchPlaceholder,
  actionLabel = 'New item',
  onAction,
  subnavigation,
  children,
  className = '',
  bodyClassName = '',
}) {
  return <div className={`panel-view-page ${className}`.trim()}>
    <header className="panel-view-header">
      <div className="panel-view-title">
        <div className="panel-title-line">
          <h1>{title}</h1>
          <span className="panel-view-mode">{ModeIcon && <ModeIcon size={14} />} {modeLabel}</span>
        </div>
      </div>
      <div className="panel-view-header-actions">
        <label className="header-search">
          <Search size={16} aria-hidden="true" />
          <input value={searchValue} onChange={(event) => onSearch?.(event.target.value)} placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}`} aria-label={searchPlaceholder ?? `Search ${title.toLowerCase()}`} />
          {searchValue && <button type="button" className="clear-search" onClick={() => onSearch?.('')} aria-label="Clear search"><X size={15} /></button>}
        </label>
        <Button onClick={onAction}><Plus size={15} /> {actionLabel}</Button>
      </div>
    </header>
    <div className="panel-subnavigation">
      <div className="panel-filter-row">{subnavigation}</div>
    </div>
    <div className={`panel-view-body ${bodyClassName}`.trim()}>{children}</div>
  </div>
}
