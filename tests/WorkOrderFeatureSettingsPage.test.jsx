import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkOrderFeatureSettingsPage } from '../src/pages/settings/WorkOrderFeatureSettingsPage'
import { WorkOrderFieldsPage } from '../src/pages/settings/WorkOrderFieldsPage'

const mocks = vi.hoisted(() => ({
  updateOrganization: vi.fn(),
  getNextWorkOrderNumber: vi.fn(),
  updateWorkOrderStartingNumber: vi.fn(),
  patchOrganization: vi.fn(),
  workspace: {
    organization: {
      id: 'org-1',
      name: 'Acme Corp',
      role: 'admin',
      roleDefinition: { system_key: 'organization_admin' },
      feature_labels: {},
      feature_modules: { workOrderTemplate: false },
      work_order_settings: {
        enableCostTracking: true,
        requireCostTracking: true,
        enableTimeTracking: true,
        requireTimeTracking: true,
        enableParts: true,
        enableUnitCostOverrides: true,
        requireParts: true,
      },
      work_order_start_number: 1,
    },
    patchOrganization: vi.fn(),
  },
}))

vi.mock('../src/components/layout/useWorkspace', () => ({
  useWorkspace: () => mocks.workspace,
}))

vi.mock('../src/services/organizationService', () => ({
  updateOrganization: mocks.updateOrganization,
  getNextWorkOrderNumber: mocks.getNextWorkOrderNumber,
  updateWorkOrderStartingNumber: mocks.updateWorkOrderStartingNumber,
}))

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.workspace.organization.work_order_settings = {
    enableCostTracking: true,
    requireCostTracking: true,
    enableTimeTracking: true,
    requireTimeTracking: true,
    enableParts: true,
    enableUnitCostOverrides: true,
    requireParts: true,
  }
  mocks.updateOrganization.mockResolvedValue({})
  mocks.getNextWorkOrderNumber.mockResolvedValue(1)
})

describe('Work Order feature settings', () => {
  it('turns off only the Cost child setting when cost tracking is disabled', async () => {
    render(<WorkOrderFeatureSettingsPage onNavigate={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Cost' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Time' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Parts' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('switch', { name: 'Enable cost tracking' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith({
      organizationId: 'org-1',
      updates: {
        work_order_settings: expect.objectContaining({
          enableCostTracking: false,
          requireCostTracking: false,
          enableTimeTracking: true,
          requireTimeTracking: true,
          enableParts: true,
          enableUnitCostOverrides: true,
          requireParts: true,
        }),
      },
    }))

    expect(screen.getByRole('switch', { name: 'Enable cost tracking' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Enable time tracking' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: 'Enable time tracking' })).toBeEnabled()
    expect(screen.getByRole('switch', { name: 'Require cost tracking' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Require time tracking' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: 'Enable parts' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: 'Manage custom cost types' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Manage custom time types' })).toBeEnabled()
  })

  it('normalizes each disabled category before rendering its child controls', () => {
    mocks.workspace.organization.work_order_settings = {
      enableCostTracking: false,
      enableTimeTracking: true,
      requireTimeTracking: true,
      enableParts: false,
      requireParts: true,
    }

    render(<WorkOrderFeatureSettingsPage onNavigate={vi.fn()} />)

    const trackingCard = screen.getByRole('heading', { name: 'Time & Cost Tracking' }).closest('section')
    expect(within(trackingCard).getByRole('switch', { name: 'Enable time tracking' })).toHaveAttribute('aria-checked', 'true')
    expect(within(trackingCard).getByRole('switch', { name: 'Require time tracking' })).toHaveAttribute('aria-checked', 'true')
    expect(within(trackingCard).getByRole('switch', { name: 'Enable parts' })).toHaveAttribute('aria-checked', 'false')
    expect(within(trackingCard).getByRole('switch', { name: 'Require parts' })).toHaveAttribute('aria-checked', 'false')
  })

  it('clears only the disabled category when time tracking is turned off', async () => {
    render(<WorkOrderFeatureSettingsPage onNavigate={vi.fn()} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Enable time tracking' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith({
      organizationId: 'org-1',
      updates: {
        work_order_settings: expect.objectContaining({
          enableCostTracking: true,
          requireCostTracking: true,
          enableTimeTracking: false,
          requireTimeTracking: false,
          enableParts: true,
          requireParts: true,
        }),
      },
    }))
  })

  it('clears Parts-dependent settings when Parts is turned off', async () => {
    render(<WorkOrderFeatureSettingsPage onNavigate={vi.fn()} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Enable parts' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith({
      organizationId: 'org-1',
      updates: {
        work_order_settings: expect.objectContaining({
          enableParts: false,
          enableUnitCostOverrides: false,
          requireParts: false,
          enableCostTracking: true,
          enableTimeTracking: true,
        }),
      },
    }))
  })

  it('enables external sharing and exposes its access settings only when enabled', async () => {
    const onNavigate = vi.fn()
    render(<WorkOrderFeatureSettingsPage onNavigate={onNavigate} />)

    const externalToggle = screen.getByRole('switch', { name: 'Share Work Order Externally' })
    expect(externalToggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('button', { name: 'Customize External Work Order access and permissions' })).not.toBeInTheDocument()

    fireEvent.click(externalToggle)

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith({
      organizationId: 'org-1',
      updates: { work_order_settings: expect.objectContaining({ externalWorkOrders: true }) },
    }))
    expect(screen.getByRole('button', { name: 'Customize External Work Order access and permissions' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Customize External Work Order access and permissions' }))
    expect(onNavigate).toHaveBeenCalledWith('Settings / Features / External Work Orders')
  })

  it('saves the required scheduling dates policy', async () => {
    render(<WorkOrderFeatureSettingsPage onNavigate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Required scheduling dates' }))
    fireEvent.click(screen.getByRole('option', { name: 'Require both dates' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith({
      organizationId: 'org-1',
      updates: { work_order_settings: expect.objectContaining({ requiredSchedule: 'both' }) },
    }))
  })

  it('opens Work Order fields from the form customization card', () => {
    const onNavigate = vi.fn()
    render(<WorkOrderFeatureSettingsPage onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Work Order fields' }))

    expect(onNavigate).toHaveBeenCalledWith('Settings / Features / Work Order Fields')
  })

  it('renders default and custom field tabs and persists field changes', async () => {
    render(<WorkOrderFieldsPage onNavigate={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Default Fields' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Asset')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Asset field setting' }))
    fireEvent.click(screen.getByRole('option', { name: 'Optional' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith({
      organizationId: 'org-1',
      updates: { work_order_settings: expect.objectContaining({ workOrderFields: expect.objectContaining({ defaultFields: expect.objectContaining({ asset: 'optional' }) }) }) },
    }))

    fireEvent.click(screen.getByRole('tab', { name: 'Custom Fields' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Another Custom Field' }))

    expect(await screen.findByRole('textbox', { name: 'Custom field 1 name' })).toBeInTheDocument()
    expect(mocks.updateOrganization).toHaveBeenCalledWith(expect.objectContaining({
      updates: { work_order_settings: expect.objectContaining({ workOrderFields: expect.objectContaining({ customFields: expect.arrayContaining([expect.objectContaining({ type: 'text' })]) }) }) },
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Custom field 1 type' }))
    expect(screen.getByRole('option', { name: 'Single Select' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'Single Select' }))
    const optionInput = await screen.findByRole('textbox', { name: 'Add option to custom field 1' })
    fireEvent.change(optionInput, { target: { value: 'Safety' } })
    fireEvent.keyDown(optionInput, { key: 'Enter' })
    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith(expect.objectContaining({
      updates: { work_order_settings: expect.objectContaining({ workOrderFields: expect.objectContaining({ customFields: expect.arrayContaining([expect.objectContaining({ type: 'single_select', options: ['Safety'] })]) }) }) },
    })))

    expect(screen.getByRole('button', { name: 'Delete custom field 1' })).toBeEnabled()
  })

  it('reorders custom fields from the grip handle and persists the new order', async () => {
    mocks.workspace.organization.work_order_settings = {
      workOrderFields: {
        customFields: [
          { id: 'one', name: 'First field', type: 'text', options: [], required: false, copyOnRepeat: true, includeOnRequest: false, includeOnRequestPortal: false },
          { id: 'two', name: 'Second field', type: 'text', options: [], required: false, copyOnRepeat: true, includeOnRequest: false, includeOnRequestPortal: false },
        ],
      },
    }
    render(<WorkOrderFieldsPage onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Custom Fields' }))

    const firstHandle = screen.getByRole('button', { name: 'Reorder custom field 1' })
    const secondCard = screen.getByRole('textbox', { name: 'Custom field 2 name' }).closest('article')
    fireEvent.dragStart(firstHandle)
    fireEvent.dragOver(secondCard, { clientY: 100 })
    fireEvent.drop(secondCard)

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith(expect.objectContaining({
      updates: { work_order_settings: expect.objectContaining({ workOrderFields: expect.objectContaining({ customFields: [expect.objectContaining({ id: 'two' }), expect.objectContaining({ id: 'one' })] }) }) },
    })))
  })

  it('confirms before deleting a custom field', async () => {
    mocks.workspace.organization.work_order_settings = {
      workOrderFields: {
        customFields: [
          { id: 'one', name: 'First field', type: 'text', options: [], required: false, copyOnRepeat: true, includeOnRequest: false, includeOnRequestPortal: false },
        ],
      },
    }
    render(<WorkOrderFieldsPage onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Custom Fields' }))
    vi.clearAllMocks()

    fireEvent.click(screen.getByRole('button', { name: 'Delete custom field 1' }))

    expect(screen.getByRole('alertdialog', { name: 'Remove custom field confirmation' })).toBeInTheDocument()
    expect(mocks.updateOrganization).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith(expect.objectContaining({
      updates: { work_order_settings: expect.objectContaining({ workOrderFields: expect.objectContaining({ customFields: [] }) }) },
    })))
  })
})
