import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkOrderDetail } from '../src/pages/work-orders/WorkOrderDetail'

const selected = {
  id: 'wo-1',
  title: 'Replace filter',
  work_order_number: 41,
  due: '09/28/2026',
  status: 'Open',
  priority: 'High',
  is_read: true,
  created_by: 'user-a',
  assigned_to: 'user-b',
  team_id: 'team-a',
  workType: 'Work Order',
  location: 'Not available',
  asset: 'Not available',
  assignee: 'Assigned user',
  assignedTeam: 'Assigned user',
  description: 'Replace the filter.',
}

afterEach(cleanup)

describe('WorkOrderDetail authorization', () => {
  it('hides unauthorized work-order actions', () => {
    render(<WorkOrderDetail selected={selected} grants={{}} userId="user-a" />)

    expect(screen.queryByRole('button', { name: 'Comments' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('shows only actions granted for the selected record', () => {
    render(<WorkOrderDetail selected={selected} userId="user-b" grants={{
      'work_orders.view_comments': 'assigned',
      'work_orders.change_status': 'assigned',
      'work_orders.edit': 'own',
    }} onStatusChange={vi.fn()} />)

    expect(screen.getAllByRole('button', { name: 'Comments' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('uses loaded team membership for team-scoped actions', () => {
    render(<WorkOrderDetail selected={selected} userId="user-a" teamIds={['team-a']} grants={{
      'work_orders.view_comments': 'team',
      'work_orders.change_status': 'team',
    }} onStatusChange={vi.fn()} />)

    expect(screen.getAllByRole('button', { name: 'Comments' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
  })

  it('shows the detail overview in reference order and routes status changes', () => {
    const onStatusChange = vi.fn()
    render(<WorkOrderDetail selected={selected} userId="user-a" grants={{
      'work_orders.change_status': 'own',
    }} onStatusChange={onStatusChange} />)

    expect(screen.getByRole('group', { name: 'Work Order status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Due Date' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Priority' })).toBeInTheDocument()
    expect(screen.getByText('#41')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Assigned To' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Description' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onStatusChange).toHaveBeenCalledWith(selected, 'Completed')
  })

  it('replaces Edit with Mark as Done after scrolling the detail pane', () => {
    const onStatusChange = vi.fn()
    const { container } = render(<WorkOrderDetail selected={selected} userId="user-a" grants={{
      'work_orders.change_status': 'own',
      'work_orders.edit': 'own',
    }} onStatusChange={onStatusChange} />)

    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled()
    const detailScroll = container.querySelector('.detail-scroll')
    detailScroll.scrollTop = 150
    fireEvent.scroll(detailScroll)

    expect(screen.getByRole('button', { name: 'Mark as Done' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Mark as Done' }))
    expect(onStatusChange).toHaveBeenCalledWith(selected, 'Completed')
  })

  it('includes the remaining reference sections without claiming unsupported features', () => {
    render(<WorkOrderDetail selected={{ ...selected, estimated_duration_minutes: 60 }} userId="user-a" grants={{
      'work_orders.view_comments': 'own',
    }} />)

    expect(screen.getByRole('heading', { name: 'Asset' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Location' })).toBeInTheDocument()
    expect(screen.getByText('1h')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Time & Cost Tracking' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comments' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Add/ })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /Add/ }).every((button) => button.disabled)).toBe(true)
  })

  it('shows the work-order menu options and locks actions that are not implemented', () => {
    const onToggleRead = vi.fn()
    render(<WorkOrderDetail selected={selected} userId="user-a" grants={{}}
      onToggleRead={onToggleRead} />)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    const menu = screen.getByRole('menu', { name: 'Work Order actions' })
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(8)
    expect(within(menu).getByRole('menuitem', { name: 'Mark as unread' })).toBeEnabled()
    expect(within(menu).getByRole('menuitem', { name: 'Edit' })).toBeDisabled()
    expect(within(menu).getByRole('menuitem', { name: 'Delete' })).toBeDisabled()
    expect(menu.querySelectorAll('button.is-unavailable svg')).toHaveLength(7)

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Mark as unread' }))
    expect(onToggleRead).toHaveBeenCalledWith(selected)
  })
})
