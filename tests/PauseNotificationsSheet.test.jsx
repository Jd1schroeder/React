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
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query.includes('max-width: 840px'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const onCancel = vi.fn()
    render(<PauseNotificationsSheet onCancel={onCancel} onSelect={vi.fn()} />)
    const grabber = document.querySelector('.mobile-sheet-drag-handle')
    const sendTouchEvent = (type, clientY) => {
      const touch = { clientY }
      const dispatch = { touchstart: fireEvent.touchStart, touchmove: fireEvent.touchMove, touchend: fireEvent.touchEnd }[type]
      dispatch(grabber, {
        touches: type === 'touchend' ? [] : [touch],
        changedTouches: [touch],
      })
    }

    sendTouchEvent('touchstart', 20)
    sendTouchEvent('touchmove', 150)
    sendTouchEvent('touchend', 150)

    expect(onCancel).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(280) })
    expect(onCancel).toHaveBeenCalledOnce()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
})
