import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PanelView } from '../src/components/layout/PanelView'

describe('mobile record navigation', () => {
  it('returns from a deep-linked record to its module list route', () => {
    const onNavigate = vi.fn()
    render(<PanelView
      title="Assets"
      items={[]}
      kind="asset"
      recordId="asset-a"
      recordType="assets"
      onNavigate={onNavigate}
    />)

    expect(document.querySelector('.panel-record-page')).toHaveClass('has-record-route')
    fireEvent.click(screen.getByRole('button', { name: 'Back to Assets' }))

    expect(onNavigate).toHaveBeenCalledWith('/assets')
  })

  it('uses the configured parent route for nested module records', () => {
    const onNavigate = vi.fn()
    render(<PanelView
      title="Reporting / Work Orders"
      items={[]}
      kind="report"
      recordId="report-a"
      listPath="/reporting/work-orders"
      onNavigate={onNavigate}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Back to Reporting / Work Orders' }))

    expect(onNavigate).toHaveBeenCalledWith('/reporting/work-orders')
  })
})
