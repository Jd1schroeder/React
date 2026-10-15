import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkOrderFilters } from '../src/pages/work-orders/WorkOrderFilters'

afterEach(cleanup)

function ControlledFilters({ onChange, assigneeOptions, customFields }) {
  const [filters, setFilters] = useState([])
  return <WorkOrderFilters
    filters={filters}
    onFiltersChange={(next) => { setFilters(next); onChange?.(next) }}
    assigneeOptions={assigneeOptions}
    customFields={customFields}
  />
}

describe('WorkOrderFilters', () => {
  it('shows blue leading icons without dropdown chevrons on filter buttons', () => {
    render(<ControlledFilters />)

    const assignedToButton = screen.getByRole('button', { name: 'Assigned To filter' })
    const addFilterButton = screen.getByRole('button', { name: /Add filter/ })
    expect(assignedToButton.parentElement).toHaveClass('work-order-filter-button-wrap')
    expect(addFilterButton.parentElement).toHaveClass('work-order-filter-button-wrap')
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
    const expectedStatusIcons = [
      ['Open', 'lucide-lock-keyhole', 'open'],
      ['On Hold', 'lucide-circle-pause', 'on-hold'],
      ['In Progress', 'lucide-rotate-cw', 'in-progress'],
      ['Done', 'lucide-check', 'completed'],
    ]
    expectedStatusIcons.forEach(([label, iconClass, tone]) => {
      const option = within(dialog).getByLabelText(label).closest('label')
      expect(option.querySelector('.work-order-filter-status-icon')).toHaveClass(tone)
      expect(option.querySelector('.work-order-filter-status-icon svg')).toHaveClass(iconClass)
    })
    fireEvent.click(within(dialog).getByLabelText('On Hold'))
    expect(onFiltersChange).toHaveBeenLastCalledWith([
      { field: 'status', operator: 'one_of', values: ['On Hold'] },
    ])

    expect(within(dialog).getByText('Status', { selector: '.work-order-filter-popover-title' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Status operator: One of' }))
    const operatorMenu = within(dialog).getByRole('group', { name: 'Status operators' })
    fireEvent.click(within(operatorMenu).getByRole('button', { name: 'None of' }))
    expect(onFiltersChange).toHaveBeenLastCalledWith([
      { field: 'status', operator: 'none_of', values: ['On Hold'] },
    ])
  })

  it('renders the selected-value count in the nested filter badge', () => {
    render(<ControlledFilters />)

    fireEvent.click(screen.getByRole('button', { name: 'Status filter' }))
    const dialog = screen.getByRole('dialog', { name: 'Status filter' })
    fireEvent.click(within(dialog).getByLabelText('Open'))
    fireEvent.click(within(dialog).getByLabelText('On Hold'))

    const statusFilter = screen.getByRole('button', { name: 'Status filter, One of, 2 selected' })
    const badge = statusFilter.querySelector('.work-order-filter-count')
    expect(badge).toHaveTextContent('2')
    expect(badge.querySelector('.work-order-filter-count-badge')).toHaveTextContent('2')
  })

  it('shows the Work Order priorities in the filter', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters onChange={onFiltersChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Priority' }))

    const dialog = screen.getByRole('dialog', { name: 'Priority filter' })
    const priorities = within(dialog).getAllByRole('menuitem').map((item) => item.textContent.trim())
    expect(priorities).toEqual(['None', 'Low', 'Medium', 'High'])
    expect(within(dialog).getByRole('menuitem', { name: 'None' }).closest('.work-order-filter-option-row').querySelector('.work-order-filter-option-icon svg')).toBeNull()
    expect(within(dialog).getByRole('menuitem', { name: 'Low' }).closest('.work-order-filter-option-row').querySelector('.lucide-circle-arrow-down')).not.toBeNull()
    expect(within(dialog).getByRole('menuitem', { name: 'Medium' }).closest('.work-order-filter-option-row').querySelector('.lucide-circle-minus')).not.toBeNull()
    expect(within(dialog).getByRole('menuitem', { name: 'High' }).closest('.work-order-filter-option-row').querySelector('.lucide-circle-arrow-up')).not.toBeNull()

    fireEvent.click(within(dialog).getByLabelText('None'))
    expect(onFiltersChange).toHaveBeenLastCalledWith([
      { field: 'priority', operator: 'one_of', values: ['None'] },
    ])
  })

  it('shows configured custom fields at the end of the Add filter menu', () => {
    render(<ControlledFilters customFields={[{ id: 'custom-link', name: 'Link Test', type: 'link' }, { id: 'custom-number', name: 'Number 1', type: 'number' }]} />)
    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))

    const dialog = screen.getByRole('dialog', { name: 'Add Work Order filter' })
    const options = within(dialog).getAllByRole('button').map((button) => button.textContent.trim())
    expect(options).toEqual(['Due date', 'Priority', 'Work type', 'Start date', 'Link Test', 'Number 1'])
    expect(within(dialog).getByRole('button', { name: 'Link Test' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Link Test' }).querySelector('.lucide-link')).not.toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Number 1' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Number 1' }).querySelector('.lucide-hash')).not.toBeNull()
  })

  it('supports multi-select single-select custom field filters and empty operators', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters
      onChange={onFiltersChange}
      customFields={[{ id: 'custom-tool', name: 'Tool', type: 'single_select', options: ['Dew Point Meter', 'Manual Grease Gun'] }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Tool' }))
    const dialog = screen.getByRole('dialog', { name: 'Tool filter' })
    expect(within(dialog).getByRole('button', { name: 'Tool operator: One of' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByLabelText('Dew Point Meter'))
    fireEvent.click(within(dialog).getByLabelText('Manual Grease Gun'))
    expect(onFiltersChange).toHaveBeenLastCalledWith([{ field: 'custom-tool', operator: 'one_of', values: ['Dew Point Meter', 'Manual Grease Gun'] }])

    fireEvent.click(within(dialog).getByRole('button', { name: 'Tool operator: One of' }))
    const operatorMenu = within(dialog).getByRole('group', { name: 'Tool operators' })
    fireEvent.click(within(operatorMenu).getByRole('button', { name: 'Is empty' }))
    expect(onFiltersChange).toHaveBeenLastCalledWith([{ field: 'custom-tool', operator: 'is_empty', values: [] }])
  })

  it('supports Single Line Text contains and empty operators', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters
      onChange={onFiltersChange}
      customFields={[{ id: 'custom-reference', name: 'Reference', type: 'text' }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Reference' }))
    const dialog = screen.getByRole('dialog', { name: 'Reference filter' })
    expect(within(dialog).getByRole('button', { name: 'Reference operator: Contains' })).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Reference' }), { target: { value: 'pump' } })
    expect(onFiltersChange).toHaveBeenLastCalledWith([{ field: 'custom-reference', operator: 'contains', values: ['pump'] }])

    fireEvent.click(within(dialog).getByRole('button', { name: 'Reference operator: Contains' }))
    const operatorMenu = within(dialog).getByRole('group', { name: 'Reference operators' })
    fireEvent.click(within(operatorMenu).getByRole('button', { name: 'Is not empty' }))
    expect(onFiltersChange).toHaveBeenLastCalledWith([{ field: 'custom-reference', operator: 'is_not_empty', values: [] }])
  })

  it('supports Multi-Line Text contains and empty operators', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters
      onChange={onFiltersChange}
      customFields={[{ id: 'custom-notes', name: 'Notes', type: 'long_text' }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    const dialog = screen.getByRole('dialog', { name: 'Notes filter' })
    expect(within(dialog).getByRole('button', { name: 'Notes operator: Contains' })).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Notes' }), { target: { value: 'pump' } })
    expect(onFiltersChange).toHaveBeenLastCalledWith([{ field: 'custom-notes', operator: 'contains', values: ['pump'] }])
  })

  it('supports Date & Time preset filters', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters
      onChange={onFiltersChange}
      customFields={[{ id: 'custom-inspection', name: 'Inspection', type: 'datetime' }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Inspection' }))
    const dialog = screen.getByRole('dialog', { name: 'Inspection filter' })
    expect(within(dialog).getByRole('button', { name: 'Inspection operator: One of' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByLabelText('Today'))
    expect(onFiltersChange).toHaveBeenLastCalledWith([{ field: 'custom-inspection', operator: 'one_of', values: ['today'] }])

    fireEvent.click(within(dialog).getByRole('button', { name: 'Inspection operator: One of' }))
    expect(within(dialog).getByRole('button', { name: 'None of' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Is empty' })).toBeInTheDocument()
  })

  it('supports Date preset filters', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters
      onChange={onFiltersChange}
      customFields={[{ id: 'custom-service-date', name: 'Service Date', type: 'date' }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Service Date' }))
    const dialog = screen.getByRole('dialog', { name: 'Service Date filter' })
    fireEvent.click(within(dialog).getByLabelText('Next 7 Days'))
    expect(onFiltersChange).toHaveBeenLastCalledWith([{ field: 'custom-service-date', operator: 'one_of', values: ['next_7_days'] }])
  })

  it('supports Number contains filters', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters
      onChange={onFiltersChange}
      customFields={[{ id: 'custom-meter', name: 'Meter', type: 'number' }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Meter' }))
    const dialog = screen.getByRole('dialog', { name: 'Meter filter' })
    expect(within(dialog).getByRole('button', { name: 'Meter operator: Contains' })).toBeInTheDocument()
    expect(within(dialog).getByPlaceholderText('Enter Number')).toHaveAttribute('type', 'number')
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Meter' }), { target: { value: '12' } })
    expect(onFiltersChange).toHaveBeenLastCalledWith([{ field: 'custom-meter', operator: 'contains', values: ['12'] }])
  })

  it('supports Link contains filters', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters
      onChange={onFiltersChange}
      customFields={[{ id: 'custom-link', name: 'Link', type: 'link' }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Link' }))
    const dialog = screen.getByRole('dialog', { name: 'Link filter' })
    expect(within(dialog).getByRole('button', { name: 'Link operator: Contains' })).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Link' }), { target: { value: 'google.com' } })
    expect(onFiltersChange).toHaveBeenLastCalledWith([{ field: 'custom-link', operator: 'contains', values: ['google.com'] }])
  })

  it('adds a due-date filter and applies a complete date range', () => {
    const onFiltersChange = vi.fn()
    render(<ControlledFilters onChange={onFiltersChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Add filter/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Due date' }))
    const dialog = screen.getByRole('dialog', { name: 'Due date filter' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Due date operator: On' }))
    fireEvent.click(within(within(dialog).getByRole('group', { name: 'Due date operators' })).getByRole('button', { name: 'Between' }))
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
