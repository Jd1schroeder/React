import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

export function SortableHeader({ label, column, sortKey, sortDirection, onSort }) {
  const isActive = sortKey === column
  const Icon = isActive ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown
  return <button type="button" className={`data-table-sort-header ${isActive ? 'is-active' : ''}`} onClick={() => onSort(column)}>
    <span>{label}</span><Icon size={14} strokeWidth={2} aria-hidden="true" />
  </button>
}
