import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PauseNotificationsSheet } from '../src/pages/settings/PauseNotificationsSheet'

afterEach(cleanup)

describe('PauseNotificationsSheet', () => {
  it('shows the pause durations and cancels on request', () => {
    const onCancel = vi.fn()
    render(<PauseNotificationsSheet onCancel={onCancel} onSelect={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause for 30 minutes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause for 1 hour' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause for 4 hours' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause until tomorrow' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause until next week' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('sends the selected pause duration to its owner', () => {
    const onSelect = vi.fn()
    render(<PauseNotificationsSheet onCancel={vi.fn()} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pause until tomorrow' }))
    expect(onSelect).toHaveBeenCalledWith('Pause until tomorrow')
  })

  it('shows the paused-until time and offers resume', () => {
    const onResume = vi.fn()
    render(<PauseNotificationsSheet pausedUntil={new Date('2026-10-09T22:29:00')} onCancel={vi.fn()} onResume={onResume} onSelect={vi.fn()} />)

    expect(screen.getByText(/Notifications paused until/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(onResume).toHaveBeenCalledOnce()
  })

  it('dismisses when the sheet grabber is dragged down', () => {
    vi.useFakeTimers()
    const onCancel = vi.fn()
    render(<PauseNotificationsSheet onCancel={onCancel} onSelect={vi.fn()} />)
    const grabber = document.querySelector('.profile-pause-sheet-grabber')
    const sendPointerEvent = (type, clientY) => {
      const event = new Event(type, { bubbles: true })
      Object.assign(event, { clientY, pointerId: 1, isPrimary: true, button: 0 })
      fireEvent(grabber, event)
    }

    sendPointerEvent('pointerdown', 20)
    sendPointerEvent('pointermove', 150)
    sendPointerEvent('pointerup', 150)

    expect(onCancel).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(180) })
    expect(onCancel).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})
