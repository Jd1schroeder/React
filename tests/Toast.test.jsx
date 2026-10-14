import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileDown } from 'lucide-react'
import { ToastProvider } from '../src/components/ui/Toast'
import { useToast } from '../src/components/ui/useToast'

function ToastTrigger() {
  const { showToast } = useToast()

  return (
    <>
      <button type="button" onClick={() => showToast('Saved successfully.')}>Show success</button>
      <button type="button" onClick={() => showToast('Unable to save.', { tone: 'error' })}>Show error</button>
      <button type="button" onClick={() => showToast('PDF download started.', { icon: FileDown })}>Show custom icon</button>
    </>
  )
}

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('Toast system', () => {
  it('shows success and error notifications through the shared provider', () => {
    render(<ToastProvider><ToastTrigger /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show error' }))

    expect(screen.getByText('Saved successfully.')).toBeInTheDocument()
    expect(screen.getByText('Unable to save.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Dismiss notification' })).toHaveLength(2)
  })

  it('dismisses a notification when its close button is pressed', () => {
    render(<ToastProvider><ToastTrigger /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))

    expect(screen.queryByText('Saved successfully.')).not.toBeInTheDocument()
  })

  it('dismisses a notification when swiped left or right', () => {
    render(<ToastProvider><ToastTrigger /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))
    const rightSwipeToast = screen.getByText('Saved successfully.').closest('.wb-toast')
    fireEvent.touchStart(rightSwipeToast, { touches: [{ clientX: 100, clientY: 20 }] })
    fireEvent.touchMove(rightSwipeToast, { touches: [{ clientX: 190, clientY: 20 }] })
    fireEvent.touchEnd(rightSwipeToast, { touches: [], changedTouches: [{ clientX: 190, clientY: 20 }] })
    expect(screen.queryByText('Saved successfully.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show error' }))
    const leftSwipeToast = screen.getByText('Unable to save.').closest('.wb-toast')
    fireEvent.touchStart(leftSwipeToast, { touches: [{ clientX: 190, clientY: 20 }] })
    fireEvent.touchMove(leftSwipeToast, { touches: [{ clientX: 100, clientY: 20 }] })
    fireEvent.touchEnd(leftSwipeToast, { touches: [], changedTouches: [{ clientX: 100, clientY: 20 }] })
    expect(screen.queryByText('Unable to save.')).not.toBeInTheDocument()
  })

  it('does not dismiss a notification on a vertical swipe', () => {
    render(<ToastProvider><ToastTrigger /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))
    const toast = screen.getByText('Saved successfully.').closest('.wb-toast')
    fireEvent.touchStart(toast, { touches: [{ clientX: 100, clientY: 20 }] })
    fireEvent.touchMove(toast, { touches: [{ clientX: 105, clientY: 110 }] })
    fireEvent.touchEnd(toast, { touches: [], changedTouches: [{ clientX: 105, clientY: 110 }] })

    expect(screen.getByText('Saved successfully.')).toBeInTheDocument()
  })

  it('applies the error tone and supports custom icons', () => {
    render(<ToastProvider><ToastTrigger /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Show error' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show custom icon' }))

    expect(screen.getByText('Unable to save.').closest('.wb-toast')).toHaveClass('is-error')
    expect(screen.getByText('Unable to save.').closest('.wb-toast').querySelector('svg.lucide-circle-alert')).toBeInTheDocument()
    expect(screen.getByText('PDF download started.').closest('.wb-toast').querySelector('svg.lucide-file-down')).toBeInTheDocument()
  })

  it('keeps persistent notifications until they are manually dismissed', () => {
    vi.useFakeTimers()
    function PersistentToastTrigger() {
      const { showToast } = useToast()
      return <button type="button" onClick={() => showToast('Persistent message.', { duration: false })}>Show persistent</button>
    }

    render(<ToastProvider><PersistentToastTrigger /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Show persistent' }))
    act(() => vi.advanceTimersByTime(10000))

    expect(screen.getByText('Persistent message.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(screen.queryByText('Persistent message.')).not.toBeInTheDocument()
  })

  it('auto-dismisses notifications after the configured duration', () => {
    vi.useFakeTimers()
    render(<ToastProvider><ToastTrigger /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))
    expect(screen.getByText('Saved successfully.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(7000))

    expect(screen.queryByText('Saved successfully.')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
