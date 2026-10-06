import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkOrderFilters } from '../src/pages/work-orders/WorkOrderFilters'

afterEach(cleanup)

function ControlledFilters({ onChange, assigneeOptions }) {
  const [filters, setFilters] = useState([])
  return <WorkOrderFilters
    filters={filters}
    onFiltersChange={(next) => { setFilters(next); onChange?.(next) }}
    assigneeOptions={assigneeOptions}
  />
}

describe('WorkOrderFilters', () => {
  it('shows blue leading icons without dropdown chevrons on filter buttons', () => {
    render(<ControlledFilters />)

    const assignedToButton = screen.getByRole('button', { name: 'Assigned To filter' })
    const addFilterButton = screen.getByRole('button', { name: /Add filter/ })
    expect(assignedToButton.querySelector('.work-order-filter-icon')).not.toBeNull()
    expect(addFilterButton.querySelector('.work-order-filter-icon')).not.toBeNull()
    expect(assignedToButton.querySelector('.lucide-chevron-down')).toBeNull()
    expect(addFilterButton.querySelector('.lucide-chevron-down')).toBeNull()
  })

  it('applies a selected status and supports changing its operator', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters onChange={onFiltersChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Status filter' }))
    const dialog = screen.getByRole('dialog', { name: 'Status filter' })
    expect(within(dialog).getByLabelText('On Hold').closest('label').querySelector('.work-order-filter-option-label')).not.toBeNull()
    fireEvent.click(within(dialog).getByLabelText('On Hold'))
    expect(onFiltersChange).toHaveBeenLastCalledWith([
      { field: 'status', operator: 'one_of', values: ['On Hold'] },
    ])

    fireEvent.change(within(dialog).getByLabelText('Status operator'), { target: { value: 'none_of' } })
    expect(onFiltersChange).toHaveBeenLastCalledWith([
      { field: 'status', operator: 'none_of', values: ['On Hold'] },
    ])
  })

  it('shows the Work Order priorities in the filter', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters onChange={onFiltersChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Priority' }))

    const dialog = screen.getByRole('dialog', { name: 'Priority filter' })
    const priorities = within(dialog).getAllByRole('checkbox').map((checkbox) => checkbox.parentElement.textContent.trim())
    expect(priorities).toEqual(['None', 'Low', 'Medium', 'High'])
    expect(within(dialog).getByLabelText('None').closest('label').querySelector('.work-order-filter-option-icon svg')).toBeNull()
    expect(within(dialog).getByLabelText('Low').closest('label').querySelector('.lucide-circle-arrow-down')).not.toBeNull()
    expect(within(dialog).getByLabelText('Medium').closest('label').querySelector('.lucide-circle-minus')).not.toBeNull()
    expect(within(dialog).getByLabelText('High').closest('label').querySelector('.lucide-circle-arrow-up')).not.toBeNull()

    fireEvent.click(within(dialog).getByLabelText('None'))
    expect(onFiltersChange).toHaveBeenLastCalledWith([
      { field: 'priority', operator: 'one_of', values: ['None'] },
    ])
  })

  it('adds a due-date filter and applies a complete date range', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters onChange={onFiltersChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Due date' }))
    const dialog = screen.getByRole('dialog', { name: 'Due date filter' })
    fireEvent.change(within(dialog).getByLabelText('Due date operator'), { target: { value: 'between' } })
    fireEvent.change(within(dialog).getByLabelText('Start date'), { target: { value: '2026-10-08' } })
    expect(onFiltersChange).not.toHaveBeenCalled()
    fireEvent.change(within(dialog).getByLabelText('End date'), { target: { value: '2026-10-10' } })

    expect(onFiltersChange).toHaveBeenLastCalledWith([
      { field: 'due_date', operator: 'between', values: ['2026-10-08', '2026-10-10'] },
    ])
    expect(screen.getByRole('button', { name: 'Due date filter, Between' })).toBeInTheDocument()
  })

  it('supports assignment search and grouped team/user choices', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters
      onChange={onFiltersChange}
      assigneeOptions={[
        { value: 'team:a0000000-0000-4000-8000-000000000001', label: 'Engineering' },
        { value: 'user:a0000000-0000-4000-8000-000000000002', label: 'Alex Worker', avatar: { name: 'Alex Worker' } },
      ]}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Assigned To filter' }))
    const dialog = screen.getByRole('dialog', { name: 'Assigned To filter' })
    expect(within(dialog).getByText('Teams')).toBeInTheDocument()
    expect(within(dialog).getByText('Users')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Search assignees' }), { target: { value: 'Engineering' } })
    fireEvent.click(within(dialog).getByLabelText('Engineering'))

    expect(onFiltersChange).toHaveBeenLastCalledWith([
      { field: 'assigned_to', operator: 'one_of', values: ['team:a0000000-0000-4000-8000-000000000001'] },
    ])
  })
})
