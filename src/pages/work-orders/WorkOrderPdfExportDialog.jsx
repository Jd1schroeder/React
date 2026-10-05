import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LockKeyhole, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { createWorkOrderPdf } from '../../services/workOrderPdfService'
import './WorkOrderPdfExportDialog.css'

const imageSizeOptions = [
  { value: 'small', label: 'Small' },
  { value: 'regular', label: 'Regular' },
  { value: 'large', label: 'Large' },
  { value: 'original', label: 'Original' },
  { value: 'file', label: 'File' },
]

const procedureFormatOptions = [
  { value: 'detailed', label: 'Detailed' },
  { value: 'summary', label: 'Summary' },
  { value: 'flags', label: 'Flags & Failures Only', disabled: true },
  { value: 'none', label: 'None' },
]

const defaultIncluded = {
  attachments: true,
  estimatedTime: true,
  basicInformation: true,
  priority: true,
  workOrderInformation: true,
  exportInformation: true,
  signatureLine: true,
}

function ExportOption({ label, checked = false, disabled = false, onChange, nested = false }) {
  return (
    <label className={`work-order-pdf-option${nested ? ' is-nested' : ''}${disabled ? ' is-locked' : ''}`} title={disabled ? `${label} is not available in Workbench yet.` : undefined}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      <span>{label}</span>
      {disabled && <LockKeyhole size={14} aria-hidden="true" />}
    </label>
  )
}

export function WorkOrderPdfExportDialog({
  isOpen,
  onClose,
  onExportComplete,
  onPrepareWorkOrder,
  returnFocusRef,
  workOrder,
  assignedTo,
  requesterName,
  createdByName,
  updatedByName,
  exportedByName,
  dateFormat,
  timezone,
}) {
  const [imageSize, setImageSize] = useState('regular')
  const [procedureFormat, setProcedureFormat] = useState('detailed')
  const [included, setIncluded] = useState(defaultIncluded)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const closeButtonRef = useRef(null)
  const isExportingRef = useRef(false)
  useEffect(() => {
    isExportingRef.current = isExporting
  }, [isExporting])

  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const focusTarget = returnFocusRef?.current
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !isExportingRef.current) {
        event.preventDefault()
        onClose()
      }
      if (event.key !== 'Tab') return
      const focusable = [...document.querySelector('.work-order-pdf-export-dialog')?.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? []]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (focusTarget?.isConnected) focusTarget.focus()
    }
  }, [isOpen, onClose, returnFocusRef])

  if (!isOpen) return null

  const toggleIncluded = (key) => (event) => {
    setIncluded((current) => ({ ...current, [key]: event.target.checked }))
  }

  const handleExport = async (event) => {
    event.preventDefault()
    setError('')
    setIsExporting(true)
    try {
      const exportWorkOrder = onPrepareWorkOrder ? await onPrepareWorkOrder(workOrder) : workOrder
      const { pdf, filename } = await createWorkOrderPdf({
        workOrder: exportWorkOrder,
        assignedTo,
        requesterName,
        createdByName,
        updatedByName,
        exportedByName,
        included,
        imageSize,
        procedureFormat,
        dateFormat,
        timezone,
      })
      pdf.save(filename)
      onExportComplete?.(filename)
      onClose()
    } catch {
      setError('Unable to create the PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return createPortal(
    <div
      className="work-order-pdf-export-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isExporting) onClose()
      }}
    >
      <section className="work-order-pdf-export-dialog" role="dialog" aria-modal="true" aria-labelledby="work-order-pdf-export-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="work-order-pdf-export-header">
          <h2 id="work-order-pdf-export-title">Export Work Order as PDF</h2>
          <button ref={closeButtonRef} type="button" className="work-order-pdf-export-close" aria-label="Close export dialog" onClick={onClose} disabled={isExporting}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <form className="work-order-pdf-export-form" onSubmit={handleExport}>
          <div className="work-order-pdf-export-body">
            <div className="work-order-pdf-export-selects">
              <label className="work-order-pdf-export-field">
                <span>Images Size</span>
                <Select ariaLabel="Images Size" className="work-order-pdf-export-select" value={imageSize} options={imageSizeOptions} onChange={setImageSize} />
              </label>
              <label className="work-order-pdf-export-field">
                <span>Procedure Format</span>
                <Select ariaLabel="Procedure Format" className="work-order-pdf-export-select" value={procedureFormat} options={procedureFormatOptions} onChange={setProcedureFormat} />
              </label>
            </div>

            <h3>What should be included on this PDF?</h3>
            <div className="work-order-pdf-export-options">
              <ExportOption label="Cost" disabled />
              <ExportOption label="Attachments" checked={included.attachments} onChange={toggleIncluded('attachments')} />
              <ExportOption label="Comments" disabled />
              <ExportOption label="Work Order History" disabled />
              <ExportOption label="Estimated Time" checked={included.estimatedTime} onChange={toggleIncluded('estimatedTime')} />
              <ExportOption label="Basic Information" checked={included.basicInformation} onChange={toggleIncluded('basicInformation')} />
              <ExportOption label="Location Address" disabled nested />
              <ExportOption label="Work Order Part Status" disabled />
              <ExportOption label="Priority" checked={included.priority} onChange={toggleIncluded('priority')} nested />
              <ExportOption label="Work Order Information" checked={included.workOrderInformation} onChange={toggleIncluded('workOrderInformation')} nested />
              <ExportOption label="Sub-Work Orders" disabled />
              <ExportOption label="Export Information" checked={included.exportInformation} onChange={toggleIncluded('exportInformation')} />
              <ExportOption label="Vendors" disabled />
              <ExportOption label="Contact Information" disabled nested />
              <ExportOption label="Signature Line" checked={included.signatureLine} onChange={toggleIncluded('signatureLine')} />
              <ExportOption label="Custom Fields" disabled />
              <ExportOption label="Tool" disabled nested />
              <ExportOption label="PO Number" disabled nested />
              <ExportOption label="CIP" disabled nested />
            </div>
            {error && <p className="work-order-pdf-export-error" role="alert">{error}</p>}
          </div>

          <footer className="work-order-pdf-export-footer">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isExporting}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isExporting}>{isExporting ? 'Creating PDF...' : 'Export'}</Button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  )
}
