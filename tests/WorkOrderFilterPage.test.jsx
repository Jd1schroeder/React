import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { UsersRound } from 'lucide-react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkOrderFilterPage } from '../src/pages/work-orders/WorkOrderFilterPage'

afterEach(cleanup)

describe('Work Order filter page', () => {
  it('shows the priority options with their matching colored icons', () => {
    render(<WorkOrderFilterPage filters={[]} onFiltersChange={vi.fn()} pageSize={50} onPageSizeChange={vi.fn()} onBack={vi.fn()} onApply={vi.fn()} onOpenSort={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Priority' }))

    for (const [priority, tone] of [['None', 'none'], ['Low', 'low'], ['Medium', 'medium'], ['High', 'high']]) {
      const checkbox = screen.getByRole('checkbox', { name: priority })
      expect(checkbox.closest('label')).toHaveClass('is-priority')
      expect(checkbox.closest('label').querySelector(`.work-order-filter-page-priority-icon.is-${tone}`)).toBeInTheDocument()
    }
  })

  it('shows user avatars and team icons in the Assigned to options', () => {
    render(<WorkOrderFilterPage
      filters={[]}
      assigneeOptions={[
        { value: 'user:user-a', label: 'Alex Technician', avatar: { firstName: 'Alex', lastName: 'Technician' } },
        { value: 'team:team-a', label: 'Maintenance', icon: UsersRound },
      ]}
      pageSize={50}
      onFiltersChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      onBack={vi.fn()}
      onApply={vi.fn()}
      onOpenSort={vi.fn()}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Assigned to' }))

    const userOption = screen.getByRole('checkbox', { name: 'Alex Technician' }).closest('label')
    expect(userOption.querySelector('.work-order-filter-page-assignee-avatar')).toHaveTextContent('AT')
    const teamOption = screen.getByRole('checkbox', { name: 'Maintenance' }).closest('label')
    expect(teamOption.querySelector('.work-order-filter-page-assignee-team-icon')).toBeInTheDocument()
  })

  it('uses the native condition select and applies the selected operator', () => {
    const onFiltersChange = vi.fn()
    render(<WorkOrderFilterPage
      filters={[{ field: 'assigned_to', operator: 'one_of', values: ['user:a0000000-0000-4000-8000-000000000001'] }]}
      assigneeOptions={[]}
      pageSize={50}
      onFiltersChange={onFiltersChange}
      onPageSizeChange={vi.fn()}
      onBack={vi.fn()}
      onApply={vi.fn()}
      onOpenSort={vi.fn()}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Assigned to' }))
    const conditionSelect = screen.getByRole('combobox', { name: 'Condition' })
    expect(conditionSelect.tagName).toBe('SELECT')
    fireEvent.change(conditionSelect, { target: { value: 'none_of' } })

    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'assigned_to', operator: 'none_of', values: ['user:a0000000-0000-4000-8000-000000000001'] },
    ])
  })

  it('shows a leading calendar icon beside date inputs', () => {
    render(<WorkOrderFilterPage filters={[]} onFiltersChange={vi.fn()} pageSize={50} onPageSizeChange={vi.fn()} onBack={vi.fn()} onApply={vi.fn()} onOpenSort={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Due Date' }))

    const dateInput = screen.getByLabelText('Due Date', { selector: 'input' })
    expect(dateInput).toHaveAttribute('type', 'date')
    const pickerButton = screen.getByRole('button', { name: 'Open Due Date picker' })
    expect(pickerButton.querySelector('.lucide-calendar-days')).toBeInTheDocument()
    const showPicker = vi.fn()
    Object.defineProperty(dateInput, 'showPicker', { configurable: true, value: showPicker })
    fireEvent.click(pickerButton)
    expect(showPicker).toHaveBeenCalledOnce()
    fireEvent.click(dateInput, { clientX: 200 })
    expect(showPicker).toHaveBeenCalledTimes(2)
    fireEvent.click(dateInput, { clientX: 70 })
    expect(showPicker).toHaveBeenCalledTimes(2)
  })

  it('offers due-date shortcuts and applies their date ranges', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'))
    try {
      const onFiltersChange = vi.fn()
      render(<WorkOrderFilterPage filters={[]} onFiltersChange={onFiltersChange} timezone="UTC" pageSize={50} onPageSizeChange={vi.fn()} onBack={vi.fn()} onApply={vi.fn()} onOpenSort={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: 'Due Date' }))
      const quickDates = screen.getByRole('group', { name: 'Quick due date options' })
      expect(within(quickDates).getAllByRole('button').map((button) => button.textContent)).toEqual([
        'Today', 'Tomorrow', 'Next 7 Days', 'Next 30 Days', 'This Month', 'Overdue', 'Custom Date',
      ])

      fireEvent.click(within(quickDates).getByRole('button', { name: 'Next 7 Days' }))
      expect(onFiltersChange).toHaveBeenLastCalledWith([
        { field: 'due_date', operator: 'between', values: ['2026-10-09', '2026-10-15'] },
      ])
      expect(within(quickDates).getByRole('button', { name: 'Next 7 Days' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument()

      fireEvent.click(within(quickDates).getByRole('button', { name: 'Overdue' }))
      expect(onFiltersChange).toHaveBeenLastCalledWith([
        { field: 'due_date', operator: 'before', values: ['2026-10-09'] },
      ])

      fireEvent.click(within(quickDates).getByRole('button', { name: 'Custom Date' }))
      expect(screen.getByRole('combobox', { name: 'Condition' })).toHaveValue('on')
      expect(screen.getByLabelText('Due Date', { selector: 'input' })).toHaveValue('')

      fireEvent.change(screen.getByRole('combobox', { name: 'Condition' }), { target: { value: 'between' } })
      expect(screen.getByRole('combobox', { name: 'Condition' })).toHaveValue('between')
      fireEvent.change(screen.getByLabelText('Start date', { selector: 'input' }), { target: { value: '2026-10-12' } })
      fireEvent.change(screen.getByLabelText('End date', { selector: 'input' }), { target: { value: '2026-10-14' } })
      expect(onFiltersChange).toHaveBeenLastCalledWith([
        { field: 'due_date', operator: 'between', values: ['2026-10-12', '2026-10-14'] },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('offers the same quick filters and date range for Start Date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'))
    try {
      const onFiltersChange = vi.fn()
      render(<WorkOrderFilterPage filters={[]} onFiltersChange={onFiltersChange} timezone="UTC" pageSize={50} onPageSizeChange={vi.fn()} onBack={vi.fn()} onApply={vi.fn()} onOpenSort={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: 'More Filters' }))
      fireEvent.click(screen.getByRole('button', { name: 'Start Date' }))
      const quickDates = screen.getByRole('group', { name: 'Quick start date options' })
      expect(within(quickDates).getAllByRole('button').map((button) => button.textContent)).toEqual([
        'Today', 'Tomorrow', 'Next 7 Days', 'Next 30 Days', 'This Month', 'Overdue', 'Custom Date',
      ])

      fireEvent.click(within(quickDates).getByRole('button', { name: 'Today' }))
      expect(onFiltersChange).toHaveBeenLastCalledWith([
        { field: 'start_date', operator: 'on', values: ['2026-10-09'] },
      ])
      expect(within(quickDates).getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByLabelText('Start Date', { selector: 'input' })).not.toBeInTheDocument()

      fireEvent.change(screen.getByRole('combobox', { name: 'Condition' }), { target: { value: 'between' } })
      fireEvent.change(screen.getByLabelText('Start date', { selector: 'input' }), { target: { value: '2026-10-12' } })
      fireEvent.change(screen.getByLabelText('End date', { selector: 'input' }), { target: { value: '2026-10-15' } })
      expect(onFiltersChange).toHaveBeenLastCalledWith([
        { field: 'start_date', operator: 'between', values: ['2026-10-12', '2026-10-15'] },
      ])
    } finally {
      vi.useRealTimers()
    }
  })
})
