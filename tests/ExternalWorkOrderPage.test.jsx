import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../src/components/ui/Toast'
import { ExternalWorkOrderPage } from '../src/pages/ExternalWorkOrderPage'

const mocks = vi.hoisted(() => ({
  getExternalWorkOrder: vi.fn(),
  postExternalWorkOrderComment: vi.fn(),
  markExternalWorkOrderFinished: vi.fn(),
}))

vi.mock('../src/services/externalWorkOrderService', () => mocks)

const payload = {
  available: true,
  workOrder: {
    id: 'wo-1',
    workOrderNumber: 42,
    title: 'Replace filter',
    status: 'Open',
    description: 'Replace the HVAC filter.',
    dueDate: '2026-10-17',
    dueTime: '16:16:00',
    priority: 'High',
    procedureProgress: 40,
    comments: [],
    attachments: [],
  },
  permissions: { description: 'view', due_date: 'view', priority: 'view', procedure: 'interact', comments: 'comment', attachments: 'view', requireCommenterName: true, requireCommenterEmail: false },
  preferences: { dateFormat: 'DD/MM/YYYY', timeFormat: '23:59', timezone: 'America/New_York' },
}

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getExternalWorkOrder.mockResolvedValue(payload)
  mocks.postExternalWorkOrderComment.mockResolvedValue({ id: 'comment-1' })
  mocks.markExternalWorkOrderFinished.mockResolvedValue({ finished: true })
})

describe('ExternalWorkOrderPage', () => {
  it('renders a scoped external experience without internal navigation', async () => {
    render(<ToastProvider><ExternalWorkOrderPage shareToken="token-1" /></ToastProvider>)

    expect(await screen.findByRole('heading', { name: 'Replace filter' })).toBeInTheDocument()
    expect(screen.getByText('This secure link provides access only to the shared Work Order.')).toBeInTheDocument()
    expect(screen.queryByText('Work Orders')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as finished' })).toBeInTheDocument()
    expect(screen.getByText('Work Order #42')).toBeInTheDocument()
    expect(screen.getByText('17/10/2026 16:16')).toBeInTheDocument()
  })

  it('shows the unavailable state for an invalid or expired link', async () => {
    mocks.getExternalWorkOrder.mockResolvedValue({ available: false })

    render(<ToastProvider><ExternalWorkOrderPage shareToken="expired-token" /></ToastProvider>)

    expect(await screen.findByRole('heading', { name: 'This link is no longer available' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Replace filter' })).not.toBeInTheDocument()
  })

  it('posts a comment and refreshes the scoped Work Order', async () => {
    render(<ToastProvider><ExternalWorkOrderPage shareToken="token-1" /></ToastProvider>)
    await screen.findByRole('heading', { name: 'Replace filter' })

    fireEvent.change(screen.getByLabelText('Your name (required)', { selector: '#external-comment-name' }), { target: { value: 'Vendor Contact' } })
    fireEvent.change(screen.getByLabelText('Add a comment'), { target: { value: 'Finished.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }))

    await waitFor(() => expect(mocks.postExternalWorkOrderComment).toHaveBeenCalledWith({ token: 'token-1', name: 'Vendor Contact', email: '', body: 'Finished.' }))
    expect(mocks.getExternalWorkOrder).toHaveBeenCalledTimes(2)
  })

  it('formats external comment timestamps using organization localization settings', async () => {
    mocks.getExternalWorkOrder.mockResolvedValue({
      ...payload,
      workOrder: {
        ...payload.workOrder,
        comments: [{ id: 'comment-1', authorName: 'Vendor Contact', body: 'Finished.', createdAt: '2026-10-14T20:16:52.000Z' }],
      },
    })

    render(<ToastProvider><ExternalWorkOrderPage shareToken="token-1" /></ToastProvider>)

    expect(await screen.findByText('Vendor Contact')).toBeInTheDocument()
    expect(screen.getByText('14/10/2026, 16:16')).toBeInTheDocument()
  })

  it('does not expose external completion when procedure access is not interactive', async () => {
    mocks.getExternalWorkOrder.mockResolvedValue({
      available: true,
      workOrder: { title: 'Vendor Work', status: 'Open', comments: [], attachments: [] },
      permissions: { procedure: 'comment', comments: 'view' },
    })

    render(<ToastProvider><ExternalWorkOrderPage shareToken="token-1" /></ToastProvider>)

    await waitFor(() => expect(screen.getByText('Vendor Work')).toBeInTheDocument())
    expect(screen.queryByText('Complete your work')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as finished' })).not.toBeInTheDocument()
  })

  it('marks the external comment email field required when configured', async () => {
    mocks.getExternalWorkOrder.mockResolvedValue({
      ...payload,
      permissions: { ...payload.permissions, requireCommenterEmail: true },
    })

    render(<ToastProvider><ExternalWorkOrderPage shareToken="token-1" /></ToastProvider>)

    const email = await screen.findByLabelText('Email (required)')
    expect(email).toBeRequired()
  })

  it('allows an anonymous comment when the commenter name requirement is disabled', async () => {
    mocks.getExternalWorkOrder.mockResolvedValue({
      ...payload,
      permissions: { ...payload.permissions, requireCommenterName: false },
    })

    render(<ToastProvider><ExternalWorkOrderPage shareToken="token-1" /></ToastProvider>)

    await screen.findByRole('heading', { name: 'Replace filter' })
    expect(screen.getByLabelText('Your name (optional)')).not.toBeRequired()
  })
})
