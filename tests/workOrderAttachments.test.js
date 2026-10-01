import { describe, expect, it } from 'vitest'
import { getSafeAttachmentExtension, WORK_ORDER_ATTACHMENT_MAX_BYTES } from '../src/utils/workOrderAttachments'

describe('Work Order attachments', () => {
  it('uses a 10 MiB per-file limit', () => {
    expect(WORK_ORDER_ATTACHMENT_MAX_BYTES).toBe(10 * 1024 * 1024)
  })

  it('keeps only a short, safe file extension in storage paths', () => {
    expect(getSafeAttachmentExtension('Machine Print.DWG')).toBe('.dwg')
    expect(getSafeAttachmentExtension('report.final.PDF')).toBe('.pdf')
    expect(getSafeAttachmentExtension('no-extension')).toBe('')
    expect(getSafeAttachmentExtension('malicious.../../name.PDF')).toBe('.pdf')
    expect(getSafeAttachmentExtension(`file.${'a'.repeat(20)}`)).toBe(`.${'a'.repeat(12)}`)
  })
})
