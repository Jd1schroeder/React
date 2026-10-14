import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkOrderFeatureSettingsPage } from '../src/pages/settings/WorkOrderFeatureSettingsPage'

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
})
