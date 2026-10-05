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

let clipboardDescriptor
afterEach(() => {
  cleanup()
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  else delete navigator.clipboard
  clipboardDescriptor = undefined
})

describe('WorkOrderDetail authorization', () => {
  it('copies the current Work Order URL using the Link icon', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const { container } = render(<WorkOrderDetail selected={selected} grants={{}} />)
    const copyButton = screen.getByRole('button', { name: 'Copy Work Order link' })

    expect(copyButton.querySelector('svg.lucide-link')).toBeInTheDocument()
    fireEvent.click(copyButton)

    expect(await screen.findByRole('status')).toHaveTextContent('Work Order link copied.')
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/workorders/wo-1`)
    expect(container.querySelector('svg.lucide-link-2')).not.toBeInTheDocument()
  })

  it('shows a loading state instead of a not-found illustration while lookup is pending', () => {
    render(<WorkOrderDetail selected={null} isLoadingRecord missingRecord={false} grants={{}} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading Work Order...')
    expect(screen.queryByAltText('Workbench 404 illustration')).not.toBeInTheDocument()
  })

  it('shows the not-found illustration only after lookup confirms the record is missing', () => {
    render(<WorkOrderDetail selected={null} missingRecord grants={{}} />)

    expect(screen.getByAltText('Workbench 404 illustration')).toBeInTheDocument()
  })

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

  it.each([null, 'None'])('hides the Priority fact when priority is %s', (priority) => {
    const { container } = render(<WorkOrderDetail selected={{ ...selected, priority }} grants={{}} />)

    expect(screen.queryByRole('heading', { name: 'Priority' })).not.toBeInTheDocument()
    expect(container.querySelector('.priority-badge')).not.toBeInTheDocument()
    expect(container.querySelector('.detail-facts-grid')).toHaveClass('detail-facts-grid--without-priority')
  })

  it('uses the warning tone for the active On Hold status button', () => {
    render(<WorkOrderDetail selected={{ ...selected, status: 'On Hold' }} userId="user-a" grants={{
      'work_orders.change_status': 'own',
    }} onStatusChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'On Hold' })).toHaveClass('on-hold', 'is-active')
  })

  it('uses the completed tone for the active Done status button', () => {
    render(<WorkOrderDetail selected={{ ...selected, status: 'Completed' }} userId="user-a" grants={{
      'work_orders.change_status': 'own',
    }} onStatusChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Done' })).toHaveClass('completed', 'is-active')
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

  it('routes the header and ellipsis Edit actions to the edit flow', () => {
    const onEdit = vi.fn()
    render(<WorkOrderDetail selected={selected} userId="user-a" grants={{
      'work_orders.edit': 'own',
    }} onEdit={onEdit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    fireEvent.click(within(screen.getByRole('menu', { name: 'Work Order actions' })).getByRole('menuitem', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(2)
  })

  it('enables Copy to New Work Order only for users with create permission', () => {
    const onCopy = vi.fn()
    render(<WorkOrderDetail selected={selected} userId="user-a" grants={{
      'work_orders.create': 'own',
    }} onCopy={onCopy} />)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy to New Work Order' }))
    expect(onCopy).toHaveBeenCalledTimes(1)
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
    expect(menu.querySelectorAll('button.is-unavailable svg')).toHaveLength(6)

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Mark as unread' }))
    expect(onToggleRead).toHaveBeenCalledWith(selected)
  })
})
