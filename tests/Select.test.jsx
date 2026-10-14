import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Select } from '../src/components/ui/Select'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Select', () => {
  it('uses the native selector on tablet and mobile viewports', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(max-width: 1199px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const onChange = vi.fn()

    render(<Select ariaLabel="Access" value="view" onChange={onChange} options={[{ value: 'hidden', label: 'Hidden' }, { value: 'view', label: 'Can view' }]} />)

    const select = await screen.findByRole('combobox', { name: 'Access' })
    expect(select).toHaveValue('view')
    expect(screen.queryByRole('button', { name: 'Access' })).not.toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'hidden' } })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('hidden', { value: 'hidden', label: 'Hidden' }))
  })
})
