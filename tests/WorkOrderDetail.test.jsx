import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkOrderDetail } from '../src/pages/work-orders/WorkOrderDetail'

const selected = {
  id: 'wo-1',
  title: 'Replace filter',
  due: '09/28/2026',
  status: 'Open',
  priority: 'High',
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

describe('WorkOrderDetail authorization', () => {
  it('hides unauthorized work-order actions', () => {
    render(<WorkOrderDetail selected={selected} grants={{}} userId="user-a" />)

    expect(screen.queryByRole('button', { name: 'Comments' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as done' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('shows only actions granted for the selected record', () => {
    render(<WorkOrderDetail selected={selected} userId="user-b" grants={{
      'work_orders.view_comments': 'assigned',
      'work_orders.change_status': 'assigned',
      'work_orders.edit': 'own',
    }} />)

    expect(screen.getAllByRole('button', { name: 'Comments' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Mark as done' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('uses loaded team membership for team-scoped actions', () => {
    render(<WorkOrderDetail selected={selected} userId="user-a" teamIds={['team-a']} grants={{
      'work_orders.view_comments': 'team',
      'work_orders.change_status': 'team',
    }} />)

    expect(screen.getAllByRole('button', { name: 'Comments' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Mark as done' }).length).toBeGreaterThan(0)
  })
})
