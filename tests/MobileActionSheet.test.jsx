import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { MobileActionSheet } from '../src/components/ui/MobileActionSheet'

afterEach(cleanup)

function Harness({ onClose = vi.fn() }) {
  const [isOpen, setIsOpen] = useState(true)
  const close = () => {
    onClose()
    setIsOpen(false)
  }

  return <>
    <button type="button">Trigger</button>
    {isOpen && <MobileActionSheet title="Actions" onClose={close}>
      <button type="button">First action</button>
    </MobileActionSheet>}
  </>
}

describe('MobileActionSheet accessibility behavior', () => {
  it('closes with Escape and returns focus to the trigger', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    trigger.focus()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog', { name: 'Actions' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps Tab focus inside the sheet', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog', { name: 'Actions' })
    const buttons = dialog.querySelectorAll('button')
    const firstButton = buttons[0]
    const lastButton = buttons[buttons.length - 1]

    lastButton.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(firstButton)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(lastButton)
  })
})
