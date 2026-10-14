import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UpdateNotice } from '../src/components/layout/UpdateNotice'

describe('UpdateNotice', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows a refresh prompt when the deployed version changes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'new-build' }),
    })

    render(<UpdateNotice enabled initialVersion="old-build" />)

    expect(await screen.findByRole('status')).toHaveTextContent('A new version of Workbench is available.')
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('does not show a prompt when the deployed version matches the running bundle', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'current-build' }),
    })

    render(<UpdateNotice enabled initialVersion="current-build" />)

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
