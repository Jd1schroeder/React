import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateWorkOrderPdf, mockPdfSave } = vi.hoisted(() => ({
  mockCreateWorkOrderPdf: vi.fn(),
  mockPdfSave: vi.fn(),
}))

vi.mock('../src/services/workOrderPdfService', () => ({
  createWorkOrderPdf: mockCreateWorkOrderPdf,
}))

import { WorkOrderPdfExportDialog } from '../src/pages/work-orders/WorkOrderPdfExportDialog'

const workOrder = {
  id: 'wo-1',
  work_order_number: 41,
  title: 'Replace filter',
  status: 'Open',
  priority: 'High',
  due: '10/16/2026',
  estimated_duration_minutes: 60,
  work_order_attachments: [],
}

function renderDialog(props = {}) {
  const onClose = vi.fn()
  const onExportComplete = vi.fn()
  const result = render(
    <WorkOrderPdfExportDialog
      isOpen
      onClose={onClose}
      onExportComplete={onExportComplete}
      workOrder={workOrder}
      assignedTo={['Alex Worker']}
      requesterName="Riley Requester"
      createdByName="Morgan Creator"
      updatedByName="Casey Updater"
      exportedByName="Alex Worker"
      dateFormat="MM/DD/YYYY"
      timezone="America/New_York"
      {...props}
    />,
  )
  return { ...result, onClose, onExportComplete }
}

beforeEach(() => {
  mockCreateWorkOrderPdf.mockClear()
  mockCreateWorkOrderPdf.mockResolvedValue({ pdf: { save: mockPdfSave }, filename: 'Work Order #41 - Replace filter.pdf' })
  mockPdfSave.mockClear()
})

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('WorkOrderPdfExportDialog', () => {
  it('shows the reference settings and locks unsupported Workbench sections', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Export Work Order as PDF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Images Size' })).toHaveTextContent('Regular')
    expect(screen.getByRole('button', { name: 'Procedure Format' })).toHaveTextContent('Detailed')
    expect(screen.getByRole('checkbox', { name: 'Attachments' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Priority' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Cost' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Comments' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Custom Fields' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Cost' }).parentElement.querySelector('svg.lucide-lock-keyhole')).toBeInTheDocument()
  })

  it('downloads the PDF using the selected options and closes the dialog', async () => {
    const { onClose, onExportComplete } = renderDialog()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Priority' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => expect(mockCreateWorkOrderPdf).toHaveBeenCalledWith(expect.objectContaining({
      workOrder,
      assignedTo: ['Alex Worker'],
      included: expect.objectContaining({ attachments: true, priority: false }),
      imageSize: 'regular',
      procedureFormat: 'detailed',
    })))
    expect(mockPdfSave).toHaveBeenCalledWith('Work Order #41 - Replace filter.pdf')
    expect(onExportComplete).toHaveBeenCalledWith('Work Order #41 - Replace filter.pdf')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('refreshes signed attachment URLs before building the PDF', async () => {
    const refreshedWorkOrder = { ...workOrder, work_order_attachments: [{ id: 'image-1', signed_url: 'https://storage.example/photo.jpg' }] }
    const onPrepareWorkOrder = vi.fn().mockResolvedValue(refreshedWorkOrder)
    renderDialog({ onPrepareWorkOrder })
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => expect(mockCreateWorkOrderPdf).toHaveBeenCalledWith(expect.objectContaining({ workOrder: refreshedWorkOrder })))
    expect(onPrepareWorkOrder).toHaveBeenCalledWith(workOrder)
  })

  it('keeps the dialog open and reports a recoverable error if PDF generation fails', async () => {
    mockCreateWorkOrderPdf.mockRejectedValueOnce(new Error('PDF generation failed'))
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to create the PDF. Please try again.')
    expect(screen.getByRole('dialog', { name: 'Export Work Order as PDF' })).toBeInTheDocument()
  })

  it('lets Escape close the procedure menu before closing the dialog', () => {
    const { onClose } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Procedure Format' }))
    fireEvent.keyDown(screen.getByRole('option', { name: 'Summary' }), { key: 'Escape' })

    expect(screen.getByRole('dialog', { name: 'Export Work Order as PDF' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
