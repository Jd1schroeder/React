import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NewWorkOrderForm } from '../src/pages/work-orders/NewWorkOrderForm'

afterEach(cleanup)

describe('NewWorkOrderForm edit mode', () => {
  it('tracks edits and clears the unsaved state when fields are restored', () => {
    const onDirtyChange = vi.fn()
    render(<NewWorkOrderForm
      mode="edit"
      initialWorkOrder={{ id: 'wo-1', title: 'Replace filter', description: 'Original description' }}
      onDirtyChange={onDirtyChange}
    />)

    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
    const title = screen.getByPlaceholderText('What needs to be done? (Required)')
    fireEvent.change(title, { target: { value: 'Updated title' } })
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
    fireEvent.change(title, { target: { value: 'Replace filter' } })
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })

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
        work_order_attachments: [
          { id: 'attachment-file', kind: 'file', file_name: 'manual.pdf' },
          { id: 'attachment-image-1', kind: 'image', file_name: 'camera.jpg', content_type: 'image/jpeg', is_thumbnail: true, signed_url: 'https://example.test/camera.jpg' },
          { id: 'attachment-image-2', kind: 'image', file_name: 'alternate.jpg', content_type: 'image/jpeg', is_thumbnail: false, signed_url: 'https://example.test/alternate.jpg' },
        ],
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
    const imageDropzone = document.querySelector('.image-dropzone')
    expect(imageDropzone.querySelector('img[alt="camera.jpg"]')).toBeInTheDocument()
    expect(imageDropzone.querySelector('img[alt="alternate.jpg"]')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Current attachments' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'alternate.jpg, select as work order thumbnail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove camera.jpg' }))
    expect(screen.getByRole('button', { name: 'alternate.jpg, work order thumbnail' })).toBeInTheDocument()

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
      retainedAttachmentIds: ['attachment-file', 'attachment-image-2'],
      thumbnailAttachmentId: 'attachment-image-2',
      files: [],
    }))
  })

  it('prefills a new-order draft when copying an existing Work Order', () => {
    const onCreate = vi.fn()
    render(<NewWorkOrderForm
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
      assigneeOptions={[{ value: 'user:user-a', label: 'Alex Technician' }]}
      onCreate={onCreate}
      onCancel={vi.fn()}
    />)

    expect(screen.getByDisplayValue('Replace filter')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Check the ventilation system.')).toBeInTheDocument()
    expect(screen.queryByText(/Details copied from the existing Work Order/)).not.toBeInTheDocument()
    expect(screen.queryByText('manual.pdf')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Replace filter',
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

describe('NewWorkOrderForm mobile controls', () => {
  it('submits from the mobile header action', () => {
    const onCreate = vi.fn()
    render(<NewWorkOrderForm onCreate={onCreate} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('What needs to be done? (Required)'), { target: { value: 'Inspect pump' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Work Order' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Inspect pump' }))
  })

  it('opens a photo source sheet and launches the camera input', async () => {
    const selectedCaptureModes = []
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function click() {
      selectedCaptureModes.push(this.getAttribute('capture'))
    })
    render(<NewWorkOrderForm onCreate={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add or take pictures' }))
    expect(screen.getByRole('dialog', { name: 'Select from' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Camera' }))

    await waitFor(() => expect(selectedCaptureModes).toEqual(['environment']))
    expect(screen.queryByRole('dialog', { name: 'Select from' })).not.toBeInTheDocument()
    inputClick.mockRestore()
  })
})
