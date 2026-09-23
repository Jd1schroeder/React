import { useMemo, useState } from 'react'
import { SortableHeader } from './SortableHeader'
import './DataTable.css'

function compareValues(left, right) {
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left ?? '').localeCompare(String(right ?? ''))
}

export function DataTable({
  ariaLabel,
  columns,
  rows,
  rowKey,
  initialSortKey,
  initialSortDirection = 'asc',
  emptyState = 'No records found.',
  className = '',
}) {
  const [sortKey, setSortKey] = useState(initialSortKey ?? columns.find((column) => column.sortable !== false)?.key)
  const [sortDirection, setSortDirection] = useState(initialSortDirection)
  const sortedRows = useMemo(() => {
    const activeColumn = columns.find((column) => column.key === sortKey)
    if (!activeColumn?.sortable || !activeColumn.sortValue) return rows
    return [...rows].sort((left, right) => compareValues(activeColumn.sortValue(left), activeColumn.sortValue(right)) * (sortDirection === 'asc' ? 1 : -1))
  }, [columns, rows, sortDirection, sortKey])
  const handleSort = (column) => {
    if (column === sortKey) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
    else { setSortKey(column); setSortDirection('asc') }
  }

  return <div className={`data-table-scroll ${className}`.trim()}>
    <table className="data-table" aria-label={ariaLabel}>
      <thead><tr>{columns.map((column) => <th key={column.key} style={column.width ? { width: column.width } : undefined}>{column.sortable === false ? <span>{column.label}</span> : <SortableHeader label={column.label} column={column.key} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />}</th>)}</tr></thead>
      <tbody>{sortedRows.map((row, index) => <tr key={rowKey(row, index)}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody>
    </table>
    {!sortedRows.length && <p className="data-table-empty">{emptyState}</p>}
  </div>
}
