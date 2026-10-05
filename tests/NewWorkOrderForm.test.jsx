import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NewWorkOrderForm } from '../src/pages/work-orders/NewWorkOrderForm'

afterEach(cleanup)

describe('NewWorkOrderForm edit mode', () => {
  it('prefills persisted fields and submits changes through onUpdate', () => {
    const onUpdate = vi.fn()
    render(<NewWorkOrderForm
      mode="edit"
      initialWorkOrder={{
        id: 'wo-1',
        title: 'Replace filter',
        description: 'Check the ventilation system.',
        priority: 'High',
        due_date: '2026-10-16',
        due_time: '14:30:00',
        start_date: '2026-10-10',
        estimated_duration_minutes: 90,
        work_type: 'preventive',
        work_order_assignments: [{ user_id: 'user-a', team_id: null }],
        work_order_attachments: [{ id: 'attachment-1', kind: 'file', file_name: 'manual.pdf' }],
      }}
      assigneeOptions={[]}
      onUpdate={onUpdate}
      onCancel={vi.fn()}
    />)

    expect(screen.getByDisplayValue('Replace filter')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Check the ventilation system.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'High' })).toHaveClass('selected')
    expect(screen.getByLabelText('Hours')).toHaveValue('1')
    expect(screen.getByLabelText('Minutes')).toHaveValue('30')
    expect(screen.getByRole('textbox', { name: 'Due Date' })).toHaveValue('10/16/2026')
    expect(screen.getByLabelText('Due time')).toHaveValue('14:30')
    expect(screen.getByRole('textbox', { name: 'Start Date' })).toHaveValue('10/10/2026')
    expect(screen.getByText('manual.pdf')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('What needs to be done? (Required)'), { target: { value: 'Replace the filter assembly' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Replace the filter assembly',
      description: 'Check the ventilation system.',
      priority: 'High',
      dueDate: '2026-10-16',
      dueTime: '14:30',
      startDate: '2026-10-10',
      estimatedDurationMinutes: 90,
      workType: 'preventive',
      assignments: [{ userId: 'user-a' }],
      pictures: [],
      files: [],
    }))
  })
})
