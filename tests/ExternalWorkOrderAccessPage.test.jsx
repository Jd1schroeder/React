import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../src/components/ui/Toast'
import { ExternalWorkOrderAccessPage } from '../src/pages/settings/ExternalWorkOrderAccessPage'

const mocks = vi.hoisted(() => ({
  updateOrganization: vi.fn(),
  patchOrganization: vi.fn(),
  workspace: {
    organization: {
      id: 'org-1',
      role: 'admin',
      roleDefinition: { system_key: 'organization_admin' },
      feature_labels: {},
      work_order_settings: { externalWorkOrders: true },
    },
    patchOrganization: vi.fn(),
  },
}))

vi.mock('../src/components/layout/useWorkspace', () => ({ useWorkspace: () => mocks.workspace }))
vi.mock('../src/services/organizationService', () => ({ updateOrganization: mocks.updateOrganization }))

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateOrganization.mockResolvedValue({})
})

describe('External Work Order access settings', () => {
  it('saves expiration and field access through organization settings', async () => {
    render(<ToastProvider><ExternalWorkOrderAccessPage onNavigate={vi.fn()} /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Shared links expire after' }))
    fireEvent.click(screen.getByRole('option', { name: '30 days' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1',
      updates: { work_order_settings: expect.objectContaining({ externalWorkOrderLinkExpiration: '30_days' }) },
    })))

    fireEvent.click(screen.getByRole('button', { name: 'Comments access' }))
    fireEvent.click(screen.getByRole('option', { name: 'Can view and comment' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenLastCalledWith(expect.objectContaining({
      updates: { work_order_settings: expect.objectContaining({ externalWorkOrderAccess: expect.objectContaining({ comments: 'comment' }) }) },
    })))

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show internal comment author names' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenLastCalledWith(expect.objectContaining({
      updates: { work_order_settings: expect.objectContaining({ externalWorkOrderAccess: expect.objectContaining({ showInternalCommentAuthors: true }) }) },
    })))

    fireEvent.click(screen.getByRole('checkbox', { name: 'Require commenter email' }))

    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenLastCalledWith(expect.objectContaining({
      updates: { work_order_settings: expect.objectContaining({ externalWorkOrderAccess: expect.objectContaining({ requireCommenterEmail: true }) }) },
    })))
  })
})
