import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const preferenceMocks = vi.hoisted(() => ({
  loadNotificationSettings: vi.fn(),
  saveNotificationSettings: vi.fn(),
}))

vi.mock('../src/services/notificationPreferenceService', () => preferenceMocks)

import { NotificationSettingsPage } from '../src/pages/settings/NotificationSettingsPage'

afterEach(cleanup)

describe('NotificationSettingsPage mobile flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    preferenceMocks.loadNotificationSettings.mockResolvedValue({})
    preferenceMocks.saveNotificationSettings.mockResolvedValue({})
  })

  it('routes Work Orders through notification type selection and grouped preferences', async () => {
    const onMobileHeaderTitleChange = vi.fn()
    const { container } = render(<NotificationSettingsPage onNavigate={vi.fn()} onMobileHeaderTitleChange={onMobileHeaderTitleChange} />)
    const mobile = container.querySelector('.notification-mobile-settings')

    fireEvent.click(await within(mobile).findByRole('button', { name: /Work Orders/ }))
    await waitFor(() => expect(onMobileHeaderTitleChange).toHaveBeenLastCalledWith('Work Orders'))
    fireEvent.click(within(mobile).getByRole('button', { name: /Email Notifications/ }))

    const createdByMe = mobile.querySelector('.notification-mobile-event-group')
    const overdueToggle = within(createdByMe).getByRole('checkbox', { name: 'Becomes overdue email' })
    expect(overdueToggle).toBeEnabled()
    fireEvent.click(overdueToggle)
    await waitFor(() => expect(preferenceMocks.saveNotificationSettings).toHaveBeenCalledWith(expect.objectContaining({
      'Work Orders.Created by me.Becomes overdue.email': true,
    })))
  })

  it('backs from Work Orders preferences to channel selection, then to categories', async () => {
    const onMobileHeaderBackChange = vi.fn()
    const { container } = render(<NotificationSettingsPage onNavigate={vi.fn()} onMobileHeaderBackChange={onMobileHeaderBackChange} />)
    const mobile = container.querySelector('.notification-mobile-settings')

    fireEvent.click(await within(mobile).findByRole('button', { name: /Work Orders/ }))
    fireEvent.click(within(mobile).getByRole('button', { name: /Email Notifications/ }))
    expect(within(mobile).getByRole('heading', { name: 'Email Notifications' })).toBeInTheDocument()

    await waitFor(() => expect(onMobileHeaderBackChange).toHaveBeenLastCalledWith(expect.any(Function)))
    const initialBackUpdates = onMobileHeaderBackChange.mock.calls.length
    onMobileHeaderBackChange.mock.lastCall[0]()
    await within(mobile).findByRole('button', { name: /Email Notifications/ })
    await waitFor(() => expect(onMobileHeaderBackChange.mock.calls.length).toBeGreaterThan(initialBackUpdates))

    await waitFor(() => expect(onMobileHeaderBackChange).toHaveBeenLastCalledWith(expect.any(Function)))
    onMobileHeaderBackChange.mock.lastCall[0]()
    await within(mobile).findByRole('button', { name: /Work Orders/ })
  })

  it('backs directly from a non-Work Orders category to the category list', async () => {
    const onMobileHeaderBackChange = vi.fn()
    const { container } = render(<NotificationSettingsPage onNavigate={vi.fn()} onMobileHeaderBackChange={onMobileHeaderBackChange} />)
    const mobile = container.querySelector('.notification-mobile-settings')

    fireEvent.click(await within(mobile).findByRole('button', { name: /Requests/ }))
    await waitFor(() => expect(onMobileHeaderBackChange).toHaveBeenLastCalledWith(expect.any(Function)))
    onMobileHeaderBackChange.mock.lastCall[0]()

    await within(mobile).findByRole('button', { name: /Requests/ })
  })

  it('opens Requests directly on its Email and Push settings with the complete Created by me group', async () => {
    const { container } = render(<NotificationSettingsPage onNavigate={vi.fn()} />)
    const mobile = container.querySelector('.notification-mobile-settings')

    fireEvent.click(await within(mobile).findByRole('button', { name: /Requests/ }))

    expect(within(mobile).queryByText('Select your preferences by notification type')).not.toBeInTheDocument()
    expect(within(mobile).getByRole('heading', { name: 'Email Notifications' })).toBeInTheDocument()
    expect(within(mobile).getByRole('heading', { name: 'Push Notifications' })).toBeInTheDocument()
    const createdByMe = mobile.querySelectorAll('.notification-mobile-event-group')[1]
    expect(within(createdByMe).getByText('Only mentions in comments')).toBeInTheDocument()
    expect(within(createdByMe).getByText('Status has changed')).toBeInTheDocument()
  })

  it('opens Purchase Orders directly on its email preference', async () => {
    const { container } = render(<NotificationSettingsPage onNavigate={vi.fn()} />)
    const mobile = container.querySelector('.notification-mobile-settings')
    fireEvent.click(await within(mobile).findByRole('button', { name: /Purchase Orders/ }))

    expect(within(mobile).getByText(/Configure how you receive email notifications/)).toBeInTheDocument()
    const approvalToggle = within(mobile).getByRole('checkbox', { name: 'Purchase order created and needs approval' })
    fireEvent.click(approvalToggle)
    await waitFor(() => expect(preferenceMocks.saveNotificationSettings).toHaveBeenCalledWith(expect.objectContaining({
      'Purchase Orders.Requires approval.Purchase order created and needs approval.email': true,
    })))
  })

  it('opens Messages directly on its Push preference options', async () => {
    preferenceMocks.loadNotificationSettings.mockResolvedValue({ 'Messages.mode': 'All messages' })
    const { container } = render(<NotificationSettingsPage onNavigate={vi.fn()} />)
    const mobile = container.querySelector('.notification-mobile-settings')
    fireEvent.click(await within(mobile).findByRole('button', { name: /Messages/ }))

    const allMessages = within(mobile).getByRole('radio', { name: 'Every new Message' })
    expect(allMessages).toBeChecked()
    fireEvent.click(within(mobile).getByRole('radio', { name: 'Nothing' }))
    await waitFor(() => expect(preferenceMocks.saveNotificationSettings).toHaveBeenCalledWith(expect.objectContaining({ 'Messages.mode': 'None' })))
  })
})
