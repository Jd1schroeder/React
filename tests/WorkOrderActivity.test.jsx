import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { WorkOrderActivity } from '../src/pages/work-orders/WorkOrderActivity'
import { extractWorkbenchWorkOrderLinks } from '../src/utils/workOrderLinks'

const workOrderId = '2a17c033-1f43-4d8a-8b97-021652ae9872'
const order = { id: 'current-order', title: 'Current Work Order' }

afterEach(cleanup)

function renderActivity(props = {}) {
  return render(
    <MemoryRouter>
      <WorkOrderActivity
        order={order}
        memberDirectory={[{ id: 'member-1', name: 'Jordan Lee', firstName: 'Jordan', lastName: 'Lee' }]}
        canViewComments
        canPostComments
        onLoadActivity={vi.fn().mockResolvedValue({ items: [], hasMore: false, nextCursor: null })}
        onPostComment={vi.fn().mockResolvedValue({})}
        onResolveWorkOrderLinks={vi.fn().mockResolvedValue({})}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('extractWorkbenchWorkOrderLinks', () => {
  it('turns same-origin Work Order URLs into link-row segments and preserves punctuation', () => {
    expect(extractWorkbenchWorkOrderLinks(
      `See this: https://workbench.example/workorders/${workOrderId}, thanks.`,
      'https://workbench.example',
    )).toEqual([
      { type: 'text', text: 'See this: ' },
      { type: 'work-order-link', workOrderId },
      { type: 'text', text: ', thanks.' },
    ])
  })

  it('does not turn an off-origin Work Order-looking URL into an app link', () => {
    const body = `https://another.example/workorders/${workOrderId}`
    expect(extractWorkbenchWorkOrderLinks(body, 'https://workbench.example')).toEqual([{ type: 'text', text: body }])
  })

  it('recognizes a relative Work Order route', () => {
    expect(extractWorkbenchWorkOrderLinks(`/workorders/${workOrderId}`, 'https://workbench.example'))
      .toEqual([{ type: 'work-order-link', workOrderId }])
  })

  it('keeps adjacent text and punctuation in one text segment around a link row', () => {
    expect(extractWorkbenchWorkOrderLinks(
      `See this: https://workbench.example/workorders/${workOrderId}, then this.`,
      'https://workbench.example',
    )).toEqual([
      { type: 'text', text: 'See this: ' },
      { type: 'work-order-link', workOrderId },
      { type: 'text', text: ', then this.' },
    ])
  })
})

describe('WorkOrderActivity', () => {
  it('renders authored comments, audit activity, and a preview row for an app Work Order link', async () => {
    renderActivity({
      onLoadActivity: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'comment-1',
            kind: 'comment',
            author_id: 'member-1',
            body: `Please review /workorders/${workOrderId}`,
            created_at: '2026-10-05T12:00:00.000Z',
            attachments: [],
          },
          {
            id: 'activity-1',
            kind: 'activity',
            actor_id: 'member-1',
            event_type: 'status_changed',
            details: { from: 'Open', to: 'In Progress' },
            created_at: '2026-10-05T11:00:00.000Z',
          },
          {
            id: 'activity-2',
            kind: 'activity',
            actor_id: 'member-1',
            event_type: 'work_order_updated',
            details: { changes: [{ field: 'description', from: 'Before the repair', to: 'After the repair' }] },
            created_at: '2026-10-05T10:00:00.000Z',
          },
        ],
        hasMore: false,
        nextCursor: null,
      }),
      onResolveWorkOrderLinks: vi.fn().mockResolvedValue({
        [workOrderId]: {
          id: workOrderId,
          work_order_number: 17150,
          title: 'Fire Extinguisher Inspection',
          status: 'Completed',
          priority: 'High',
        },
      }),
    })

    expect(await screen.findByText('Please review')).toBeInTheDocument()
    expect(screen.getByText('Changed status from Open to In Progress.')).toBeInTheDocument()
    expect(screen.getByText('Changed the description from “Before the repair” to “After the repair”.')).toBeInTheDocument()
    expect(screen.getAllByText('Jordan Lee')).toHaveLength(3)
    const linkedOrder = await screen.findByRole('link', { name: /Fire Extinguisher Inspection/ })
    expect(linkedOrder).toHaveAttribute('href', `/workorders/${workOrderId}`)
    expect(linkedOrder).toHaveTextContent('#17150')
    expect(linkedOrder).toHaveTextContent('Done')
  })

  it('posts comment text and selected files, then refreshes the feed', async () => {
    const onLoadActivity = vi.fn().mockResolvedValue({ items: [], hasMore: false, nextCursor: null })
    const onPostComment = vi.fn().mockResolvedValue({ id: 'new-comment' })
    renderActivity({ onLoadActivity, onPostComment })
    const file = new File(['work order attachment'], 'inspection.pdf', { type: 'application/pdf' })

    fireEvent.change(screen.getByLabelText('Attach images or files'), { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText('Write a comment'), { target: { value: 'Inspection notes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(onPostComment).toHaveBeenCalledWith(order, 'Inspection notes', [file]))
    await waitFor(() => expect(onLoadActivity).toHaveBeenCalledTimes(2))
    expect(screen.getByLabelText('Write a comment')).toHaveValue('')
    expect(screen.queryByText('inspection.pdf')).not.toBeInTheDocument()
  })

  it('keeps long description changes expandable in the activity feed', async () => {
    const before = 'Old description text. '.repeat(10)
    const after = 'New description text. '.repeat(10)
    renderActivity({
      onLoadActivity: vi.fn().mockResolvedValue({
        items: [{
          id: 'activity-description',
          kind: 'activity',
          actor_id: 'member-1',
          event_type: 'work_order_updated',
          details: { changes: [{ field: 'description', from: before, to: after }] },
          created_at: '2026-10-05T10:00:00.000Z',
        }],
        hasMore: false,
        nextCursor: null,
      }),
    })

    const summary = await screen.findByText(/Changed the description from/)
    const details = summary.closest('details')
    expect(details).not.toBeNull()
    expect(details).not.toHaveAttribute('open')
    fireEvent.click(summary)
    expect(details).toHaveAttribute('open')
    expect(within(details).getByText((_, element) => element.tagName === 'P' && element.textContent === `Before: ${before}`)).toBeInTheDocument()
    expect(within(details).getByText((_, element) => element.tagName === 'P' && element.textContent === `After: ${after}`)).toBeInTheDocument()
  })

  it('shows before and after values for priority, dates, requester, assignment, attachments, and other fields', async () => {
    const photo = { id: 'image-1', file_name: 'inspection.jpg', is_thumbnail: true }
    renderActivity({
      dateFormat: 'MM/DD/YYYY',
      assigneeOptions: [{ value: 'team:team-1', label: 'Maintenance' }],
      onLoadActivity: vi.fn().mockResolvedValue({
        items: [{
          id: 'activity-field-changes',
          kind: 'activity',
          actor_id: 'member-1',
          event_type: 'work_order_updated',
          details: { changes: [
            { field: 'priority', from: 'Medium', to: 'High' },
            { field: 'due_date', from: { date: '2026-10-05', time: '08:30:00' }, to: { date: '2026-10-06', time: '16:15:00' } },
            { field: 'start_date', from: null, to: '2026-10-05' },
            { field: 'requester_id', from: 'member-1', to: null },
            { field: 'assignment', from: { team_id: 'team-1' }, to: { user_id: 'member-1' } },
            { field: 'attachments', from: [], to: [photo] },
            { field: 'future_field', from: 'Before', to: 'After' },
          ] },
          created_at: '2026-10-05T10:00:00.000Z',
        }],
        hasMore: false,
        nextCursor: null,
      }),
    })

    expect(await screen.findByText('Changed priority from “Medium” to “High”.')).toBeInTheDocument()
    expect(screen.getByText('Changed the due date/time from 10/05/2026 at 8:30 AM to 10/06/2026 at 4:15 PM.')).toBeInTheDocument()
    expect(screen.getByText('Changed the start date from No date to 10/05/2026.')).toBeInTheDocument()
    expect(screen.getByText('Changed requester from “Jordan Lee” to “None”.')).toBeInTheDocument()
    expect(screen.getByText('Changed assignment from “Maintenance” to “Jordan Lee”.')).toBeInTheDocument()
    expect(screen.getByText('Added “inspection.jpg”. Changed the thumbnail from “None” to “inspection.jpg”.')).toBeInTheDocument()
    expect(screen.getByText('Changed future field from “Before” to “After”.')).toBeInTheDocument()
  })

  it('shows the composer without exposing the activity feed when the user can post but not view', () => {
    renderActivity({ canViewComments: false, onLoadActivity: undefined })

    expect(screen.getByLabelText('Write a comment')).toBeInTheDocument()
    expect(screen.queryByLabelText('Work Order comments and activity')).not.toBeInTheDocument()
  })

  it('lets the author edit comment text, preserves attachments, and marks the result as edited', async () => {
    const originalComment = {
      id: 'comment-editable',
      kind: 'comment',
      author_id: 'member-1',
      body: 'Before edit',
      created_at: '2026-10-05T10:00:00.000Z',
      edited_at: null,
      deleted_at: null,
      attachments: [{ id: 'file-1', kind: 'file', file_name: 'inspection.pdf', signed_url: '/inspection.pdf' }],
    }
    const editedComment = { ...originalComment, body: 'After edit', edited_at: '2026-10-05T10:15:00.000Z' }
    const onLoadActivity = vi.fn()
      .mockResolvedValueOnce({ items: [originalComment], hasMore: false, nextCursor: null })
      .mockResolvedValueOnce({ items: [editedComment], hasMore: false, nextCursor: null })
    const onUpdateComment = vi.fn().mockResolvedValue(editedComment)
    renderActivity({ currentUserId: 'member-1', onLoadActivity, onUpdateComment })

    const editButton = await screen.findByRole('button', { name: 'Edit comment' })
    editButton.focus()
    expect(editButton).toHaveFocus()
    fireEvent.click(editButton)
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit comment' }), { target: { value: 'After edit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onUpdateComment).toHaveBeenCalledWith(order, originalComment, 'After edit'))
    expect(await screen.findByText('After edit')).toBeInTheDocument()
    expect(screen.getByText('Edited')).toBeInTheDocument()
    expect(screen.getByText('inspection.pdf')).toBeInTheDocument()
  })

  it('keeps an older loaded comment visible after editing it', async () => {
    const latestComment = {
      id: 'comment-latest',
      kind: 'comment',
      author_id: 'member-1',
      body: 'Latest note',
      created_at: '2026-10-05T11:00:00.000Z',
      edited_at: null,
      deleted_at: null,
      attachments: [],
    }
    const olderComment = {
      ...latestComment,
      id: 'comment-older',
      body: 'Older note',
      created_at: '2026-10-05T10:00:00.000Z',
    }
    const onLoadActivity = vi.fn()
      .mockResolvedValueOnce({ items: [latestComment, olderComment], hasMore: false, nextCursor: null })
      .mockResolvedValueOnce({ items: [latestComment], hasMore: true, nextCursor: { created_at: olderComment.created_at, id: olderComment.id } })
    const onUpdateComment = vi.fn().mockResolvedValue({ ...olderComment, body: 'Edited older note', edited_at: '2026-10-05T11:15:00.000Z' })
    renderActivity({ currentUserId: 'member-1', onLoadActivity, onUpdateComment })

    const olderArticle = (await screen.findByText('Older note')).closest('article')
    fireEvent.click(within(olderArticle).getByRole('button', { name: 'Edit comment' }))
    fireEvent.change(within(olderArticle).getByRole('textbox', { name: 'Edit comment' }), { target: { value: 'Edited older note' } })
    fireEvent.click(within(olderArticle).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onUpdateComment).toHaveBeenCalledWith(order, olderComment, 'Edited older note'))
    expect(await screen.findByText('Edited older note')).toBeInTheDocument()
    expect(onLoadActivity).toHaveBeenCalledTimes(1)
  })

  it('keeps a deleted comment as a tombstone and hides its actions and attachments', async () => {
    const comment = {
      id: 'comment-deleted',
      kind: 'comment',
      author_id: 'member-1',
      body: 'Remove this note',
      created_at: '2026-10-05T10:00:00.000Z',
      edited_at: null,
      deleted_at: null,
      attachments: [{ id: 'file-1', kind: 'file', file_name: 'private.pdf', signed_url: '/private.pdf' }],
    }
    const deletedComment = { ...comment, body: null, deleted_at: '2026-10-05T10:20:00.000Z', deleted_by: 'member-1', attachments: [] }
    const onLoadActivity = vi.fn()
      .mockResolvedValueOnce({ items: [comment], hasMore: false, nextCursor: null })
      .mockResolvedValueOnce({ items: [deletedComment], hasMore: false, nextCursor: null })
    const onDeleteComment = vi.fn().mockResolvedValue({ deletedAt: deletedComment.deleted_at, cleanupPending: false })
    renderActivity({ currentUserId: 'member-1', onLoadActivity, onDeleteComment })

    fireEvent.click(await screen.findByRole('button', { name: 'Delete comment' }))
    expect(screen.getByRole('group', { name: 'Confirm comment deletion' })).toHaveTextContent('Delete this comment?')
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))

    await waitFor(() => expect(onDeleteComment).toHaveBeenCalledWith(order, comment))
    expect(await screen.findByText('This comment was deleted.')).toBeInTheDocument()
    expect(screen.getByText(/by Jordan Lee\.$/)).toBeInTheDocument()
    expect(screen.queryByText('Remove this note')).not.toBeInTheDocument()
    expect(screen.queryByText('private.pdf')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit comment' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete comment' })).not.toBeInTheDocument()
  })

  it('keeps an older loaded comment tombstone visible after deleting it', async () => {
    const latestComment = {
      id: 'comment-latest',
      kind: 'comment',
      author_id: 'member-1',
      body: 'Latest note',
      created_at: '2026-10-05T11:00:00.000Z',
      deleted_at: null,
      attachments: [],
    }
    const olderComment = {
      ...latestComment,
      id: 'comment-older',
      body: 'Older note to remove',
      created_at: '2026-10-05T10:00:00.000Z',
    }
    const deletedAt = '2026-10-05T11:20:00.000Z'
    const onLoadActivity = vi.fn()
      .mockResolvedValueOnce({ items: [latestComment, olderComment], hasMore: false, nextCursor: null })
      .mockResolvedValueOnce({ items: [latestComment], hasMore: true, nextCursor: { created_at: olderComment.created_at, id: olderComment.id } })
    const onDeleteComment = vi.fn().mockResolvedValue({ deletedAt, cleanupPending: false })
    renderActivity({ currentUserId: 'member-1', onLoadActivity, onDeleteComment })

    const olderArticle = (await screen.findByText('Older note to remove')).closest('article')
    fireEvent.click(within(olderArticle).getByRole('button', { name: 'Delete comment' }))
    fireEvent.click(within(olderArticle).getByRole('button', { name: 'Delete', exact: true }))

    await waitFor(() => expect(onDeleteComment).toHaveBeenCalledWith(order, olderComment))
    expect(await screen.findByText('This comment was deleted.')).toBeInTheDocument()
    expect(onLoadActivity).toHaveBeenCalledTimes(1)
  })

  it('allows an organization admin to delete another member’s comment but not edit it', async () => {
    renderActivity({
      currentUserId: 'admin-1',
      canDeleteAnyComments: true,
      canPostComments: false,
      onDeleteComment: vi.fn().mockResolvedValue({ deletedAt: '2026-10-05T10:20:00.000Z', cleanupPending: false }),
      onLoadActivity: vi.fn().mockResolvedValue({
        items: [{
          id: 'comment-other-member',
          kind: 'comment',
          author_id: 'member-1',
          body: 'Other member note',
          created_at: '2026-10-05T10:00:00.000Z',
          deleted_at: null,
          attachments: [],
        }],
        hasMore: false,
        nextCursor: null,
      }),
    })

    expect(await screen.findByRole('button', { name: 'Delete comment' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit comment' })).not.toBeInTheDocument()
  })
})
