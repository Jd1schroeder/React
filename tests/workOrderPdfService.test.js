import { describe, expect, it } from 'vitest'
import { createWorkOrderPdf } from '../src/services/workOrderPdfService'

describe('createWorkOrderPdf', () => {
  it('creates a named PDF for the selected Work Order', async () => {
    const { pdf, filename } = await createWorkOrderPdf({
      workOrder: {
        id: 'wo-41',
        work_order_number: 41,
        title: 'Replace filter',
        status: 'Open',
        priority: 'High',
        due: '10/16/2026',
        estimated_duration_minutes: 60,
        work_type: 'reactive',
        description: 'Inspect the filter housing and replace the filter.',
        work_order_attachments: [],
      },
      assignedTo: ['Alex Worker'],
      requesterName: 'Riley Requester',
      createdByName: 'Morgan Creator',
      updatedByName: 'Casey Updater',
      exportedByName: 'Alex Worker',
      included: {
        basicInformation: true,
        priority: true,
        estimatedTime: true,
        workOrderInformation: true,
        attachments: true,
        exportInformation: true,
        signatureLine: true,
      },
      now: new Date('2026-10-05T16:00:00.000Z'),
    })

    expect(filename).toBe('Work Order #41 - Replace filter.pdf')
    expect(pdf.output()).toMatch(/^%PDF-/)
    expect(pdf.internal.getNumberOfPages()).toBeGreaterThan(0)
  })

  it('sanitizes characters that are not safe in a downloaded filename', async () => {
    const { filename } = await createWorkOrderPdf({
      workOrder: { id: 'wo-1', title: 'Replace / filter: inspect?' },
      included: {},
      now: new Date('2026-10-05T16:00:00.000Z'),
    })

    expect(filename).toBe('Work Order - Replace - filter- inspect-.pdf')
  })
})
