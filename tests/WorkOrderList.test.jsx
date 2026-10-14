import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WorkOrderListItem } from '../src/pages/work-orders/WorkOrderList'

describe('WorkOrderListItem', () => {
  it('surfaces an external completion request before internal review', () => {
    const onSelect = vi.fn()
    render(<WorkOrderListItem
      order={{
        id: 'wo-1',
        title: 'Replace filter',
        requester: 'Maintenance',
        work_order_number: 41,
        status: 'Open',
        priority: 'High',
        external_finished_at: '2026-10-14T18:00:00.000Z',
      }}
      selected={false}
      isRead
      onSelect={onSelect}
      onStatusChange={vi.fn()}
      canChangeStatus={false}
    />)

    expect(screen.getByRole('status')).toHaveTextContent('External completion requested')
    fireEvent.click(screen.getByRole('link', { name: 'Open Replace filter' }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'wo-1' }))
  })
})
