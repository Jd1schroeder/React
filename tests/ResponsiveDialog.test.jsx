import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ResponsiveDialog } from '../src/components/ui/ResponsiveDialog'

afterEach(cleanup)

describe('ResponsiveDialog responsive presentation rule', () => {
  it('requires complex workflows to opt into a page presentation on mobile and tablet', () => {
    const { container } = render(
      <ResponsiveDialog ariaLabel="Example dialog" mobileMode="page">
        <p>Example content</p>
      </ResponsiveDialog>,
    )

    expect(container.querySelector('.responsive-dialog-backdrop')).toHaveClass('is-mobile-page')
    expect(container.querySelector('[role="dialog"]')).toHaveClass('responsive-dialog', 'is-mobile-page')
  })

  it('keeps ordinary dialogs modal unless page mode is explicitly requested', () => {
    const { container } = render(
      <ResponsiveDialog ariaLabel="Example dialog">
        <p>Example content</p>
      </ResponsiveDialog>,
    )

    expect(container.querySelector('.responsive-dialog-backdrop')).not.toHaveClass('is-mobile-page')
    expect(container.querySelector('[role="dialog"]')).not.toHaveClass('is-mobile-page')
  })
})
