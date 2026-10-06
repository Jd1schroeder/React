import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkOrderSavedFilters } from '../src/pages/work-orders/WorkOrderSavedFilters'

afterEach(cleanup)

const sampleFilters = [{ field: 'status', operator: 'one_of', values: ['Open'] }]

describe('WorkOrderSavedFilters', () => {
  it('loads and applies a saved filter from either collection', async () => {
    const onLoad = vi.fn().mockResolvedValue()
    const onApply = vi.fn()
    render(<WorkOrderSavedFilters
      filters={[]}
      loaded
      savedFilters={[
        { id: 'personal-1', created_by: 'user-1', filter_scope: 'personal', name: 'My open work', filters: sampleFilters },
        { id: 'org-1', created_by: 'user-2', filter_scope: 'organization', name: 'Team queue', filters: sampleFilters },
      ]}
      onLoad={onLoad}
      onApply={onApply}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'My Filters' }))
    expect(onLoad).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('radio', { name: /My open work/ }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'personal-1' }))
    expect(screen.queryByRole('dialog', { name: 'My saved Work Order filters' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'My Filters' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Organization Filters' }))
    expect(screen.getByRole('radio', { name: /Team queue/ })).toBeInTheDocument()
  })

  it('lets a permitted user save the current filters to their personal collection', async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: 'saved-1' })
    render(<WorkOrderSavedFilters filters={sampleFilters} canSave onCreate={onCreate} loaded />)

    fireEvent.click(screen.getByRole('button', { name: 'My Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save current filters' }))
    const dialog = screen.getByRole('dialog', { name: 'Save current filters' })
    fireEvent.change(within(dialog).getByLabelText('Filter name'), { target: { value: 'Open work' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save filter' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ name: 'Open work', filterScope: 'personal', filters: sampleFilters }))
  })

  it('offers organization scope only to an organization administrator', () => {
    const { unmount } = render(<WorkOrderSavedFilters filters={sampleFilters} canSave loaded />)
    fireEvent.click(screen.getByRole('button', { name: 'My Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save current filters' }))
    expect(screen.queryByLabelText('Organization filters')).not.toBeInTheDocument()

    unmount()
    render(<WorkOrderSavedFilters filters={sampleFilters} canSave canManageOrganization loaded />)
    fireEvent.click(screen.getByRole('button', { name: 'My Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save current filters' }))
    expect(screen.getByLabelText('Organization filters')).toBeInTheDocument()
  })

  it('shows filter management actions only for the owner or an organization administrator', () => {
    render(<WorkOrderSavedFilters
      filters={sampleFilters}
      loaded
      userId="user-1"
      canSave
      savedFilters={[
        { id: 'mine', created_by: 'user-1', filter_scope: 'personal', name: 'Mine', filters: sampleFilters },
        { id: 'other', created_by: 'user-2', filter_scope: 'personal', name: 'Other user', filters: sampleFilters },
      ]}
    />)
    fireEvent.click(screen.getByRole('button', { name: 'My Filters' }))
    expect(screen.getByRole('button', { name: 'Rename Mine' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename Other user' })).not.toBeInTheDocument()
  })
})
