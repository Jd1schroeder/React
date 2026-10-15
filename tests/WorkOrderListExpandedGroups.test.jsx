import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkOrderList } from '../src/pages/work-orders/WorkOrderList'
import {
  getWorkOrderInboxExpandedGroupsKey,
  readWorkOrderInboxExpandedGroups,
  writeWorkOrderInboxExpandedGroups,
} from '../src/pages/work-orders/workOrderInboxExpandedGroups'

const createListProps = (overrides = {}) => ({
  userId: 'user-a',
  organizationId: 'org-a',
  activeTab: 'To Do',
  setActiveTab: vi.fn(),
  search: '',
  groupCounts: {
    'assigned-to-me': 1,
    'assigned-to-my-teams': 0,
    'created-by-me': 0,
    'all-open': 0,
    completed: 1,
  },
  readStatusById: {},
  selected: null,
  onSelect: vi.fn(),
  onOrdersLoaded: vi.fn(),
  onLoadGroupPage: vi.fn().mockResolvedValue([]),
  refreshVersion: 0,
  onStatusChange: vi.fn(),
  canChangeStatusForOrder: vi.fn(() => false),
  onReadAll: vi.fn(),
  onClearFilters: vi.fn(),
  sortId: 'priority-highest',
  onSortChange: vi.fn(),
  unreadFirst: false,
  onUnreadFirstChange: vi.fn(),
  ...overrides,
})

describe('Work Order Inbox expanded-group storage', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('scopes saved groups to the user, organization, and tab', () => {
    const todoKey = getWorkOrderInboxExpandedGroupsKey({
      userId: 'user-a', organizationId: 'org-a', activeTab: 'To Do',
    })

    expect(todoKey).toContain('workbench.workOrderInbox.expandedGroups.v1:')
    expect(todoKey).not.toBe(getWorkOrderInboxExpandedGroupsKey({
      userId: 'user-b', organizationId: 'org-a', activeTab: 'To Do',
    }))
    expect(todoKey).not.toBe(getWorkOrderInboxExpandedGroupsKey({
      userId: 'user-a', organizationId: 'org-b', activeTab: 'To Do',
    }))
    expect(todoKey).not.toBe(getWorkOrderInboxExpandedGroupsKey({
      userId: 'user-a', organizationId: 'org-a', activeTab: 'Done',
    }))
  })

  it('ignores malformed and out-of-tab group IDs', () => {
    const key = getWorkOrderInboxExpandedGroupsKey({
      userId: 'user-a', organizationId: 'org-a', activeTab: 'To Do',
    })
    window.localStorage.setItem(key, JSON.stringify([
      'assigned-to-me', 'completed', 'unknown-group', 'assigned-to-me',
    ]))

    expect(readWorkOrderInboxExpandedGroups(key, 'To Do')).toEqual({ 'assigned-to-me': true })

    window.localStorage.setItem(key, '{invalid json')
    expect(readWorkOrderInboxExpandedGroups(key, 'To Do')).toEqual({})
  })

  it('restores the open group for the same scope and removes it when collapsed', async () => {
    const props = createListProps()
    const firstRender = render(<WorkOrderList {...props} />)
    const heading = screen.getByRole('button', { name: 'Assigned to Me (1)' })

    expect(heading).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(heading)
    expect(heading).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(props.onLoadGroupPage).toHaveBeenCalled())

    const key = getWorkOrderInboxExpandedGroupsKey(props)
    expect(JSON.parse(window.localStorage.getItem(key))).toEqual(['assigned-to-me'])
    firstRender.unmount()

    render(<WorkOrderList {...createListProps()} />)
    const reopenedHeading = screen.getByRole('button', { name: 'Assigned to Me (1)' })
    expect(reopenedHeading).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(reopenedHeading)
    expect(reopenedHeading).toHaveAttribute('aria-expanded', 'false')
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('selects the first order when the first saved group loads on page entry', async () => {
    const key = getWorkOrderInboxExpandedGroupsKey(createListProps())
    writeWorkOrderInboxExpandedGroups(key, 'To Do', { 'assigned-to-me': true })
    const firstOrder = {
      id: 'work-order-1',
      title: 'First work order',
      requester: 'Requester',
      work_order_number: 1,
      status: 'open',
      priority: 'medium',
      work_order_attachments: [],
    }
    const props = createListProps({
      onLoadGroupPage: vi.fn().mockResolvedValue([firstOrder]),
    })

    render(<WorkOrderList {...props} />)

    await waitFor(() => {
      expect(props.onOrdersLoaded).toHaveBeenCalledWith(
        [firstOrder],
        { selectFirst: true },
      )
    })
  })

  it('selects the first remaining order after a refresh requests replacement selection', async () => {
    const key = getWorkOrderInboxExpandedGroupsKey(createListProps())
    writeWorkOrderInboxExpandedGroups(key, 'To Do', { 'assigned-to-me': true })
    const nextOrder = { id: 'work-order-2', title: 'Next work order', work_order_attachments: [] }
    const props = createListProps({
      selectFirstAfterRefresh: true,
      onLoadGroupPage: vi.fn().mockResolvedValue([nextOrder]),
    })

    render(<WorkOrderList {...props} />)

    await waitFor(() => {
      expect(props.onOrdersLoaded).toHaveBeenCalledWith(
        [nextOrder],
        { selectFirst: true },
      )
    })
  })

  it('shows an empty-state message when an expanded group has no orders', async () => {
    const key = getWorkOrderInboxExpandedGroupsKey(createListProps())
    writeWorkOrderInboxExpandedGroups(key, 'To Do', { 'assigned-to-me': true })
    const props = createListProps({
      onLoadGroupPage: vi.fn().mockResolvedValue([]),
    })

    render(<WorkOrderList {...props} />)

    await waitFor(() => expect(screen.getByText('No work orders in this group.')).toBeInTheDocument())
  })

  it('shows an error-state message when an expanded group fails to load', async () => {
    const key = getWorkOrderInboxExpandedGroupsKey(createListProps())
    writeWorkOrderInboxExpandedGroups(key, 'To Do', { 'assigned-to-me': true })
    const props = createListProps({
      onLoadGroupPage: vi.fn().mockRejectedValue(new Error('Unable to load Work Orders.')),
    })

    render(<WorkOrderList {...props} />)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to load Work Orders.'))
  })

  it('shows filtered Work Orders in one expanded Search results group with a clear action', async () => {
    const onClearFilters = vi.fn()
    const props = createListProps({
      filters: [{ field: 'priority', operator: 'one_of', values: ['High'] }],
      groupCounts: { 'all-open': 17, completed: 0 },
      onClearFilters,
    })

    render(<WorkOrderList {...props} />)

    expect(screen.getByRole('button', { name: 'Search results (17)' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('button', { name: 'Assigned to Me (1)' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument()
    await waitFor(() => expect(props.onLoadGroupPage).toHaveBeenCalledWith(expect.objectContaining({ group: 'all-open' })))

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })

  it('persists only the group IDs allowed for the current tab', () => {
    const key = getWorkOrderInboxExpandedGroupsKey({
      userId: 'user-a', organizationId: 'org-a', activeTab: 'Done',
    })
    writeWorkOrderInboxExpandedGroups(key, 'Done', {
      completed: true,
      'assigned-to-me': true,
    })

    expect(JSON.parse(window.localStorage.getItem(key))).toEqual(['completed'])
  })
})
