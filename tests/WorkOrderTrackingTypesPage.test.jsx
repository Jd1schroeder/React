import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkOrderTrackingTypesPage } from '../src/pages/settings/WorkOrderTrackingTypesPage'

const mocks = vi.hoisted(() => ({
  listWorkOrderTrackingTypes: vi.fn(),
  updateWorkOrderTrackingType: vi.fn(),
  workspace: { organization: { id: 'org-1' } },
}))

vi.mock('../src/components/layout/useWorkspace', () => ({
  useWorkspace: () => mocks.workspace,
}))

vi.mock('../src/services/workOrderTimeService', () => ({
  listWorkOrderTrackingTypes: mocks.listWorkOrderTrackingTypes,
  updateWorkOrderTrackingType: mocks.updateWorkOrderTrackingType,
  createWorkOrderTrackingType: vi.fn(),
  deleteWorkOrderTrackingType: vi.fn(),
}))

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listWorkOrderTrackingTypes.mockResolvedValue([{ id: 'time-1', name: 'Inspection', is_system: false }])
  mocks.updateWorkOrderTrackingType.mockResolvedValue({})
})

describe('WorkOrderTrackingTypesPage', () => {
  it('renders the edit modal as an isolated accessible dialog', async () => {
    render(<WorkOrderTrackingTypesPage onNavigate={vi.fn()} kind="time" />)

    await waitFor(() => expect(screen.getByText('Inspection')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'More options for Inspection' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit Time Type' }))

    const dialog = screen.getByRole('dialog', { name: 'Edit Time Type' })
    expect(dialog).toHaveClass('work-order-tracking-type-editor')
    expect(dialog.querySelector('.work-order-time-modal-header')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Rename time type' })).toHaveValue('Inspection')
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})
