import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../src/components/ui/Toast'
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
  vi.unstubAllGlobals()
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  else delete navigator.clipboard
  clipboardDescriptor = undefined
})

describe('WorkOrderDetail authorization', () => {
  it('shows configured custom field values above Time & Cost Tracking', () => {
    render(<ToastProvider><WorkOrderDetail
      selected={{ ...selected, custom_field_values: { permit: 'P-100', reference: 'www.google.com' } }}
      workOrderSettings={{ workOrderFields: { customFields: [
        { id: 'permit', name: 'Permit number', type: 'text' },
        { id: 'reference', name: 'Reference link', type: 'link' },
        { id: 'empty', name: 'Empty field', type: 'text' },
      ] } }}
      grants={{}}
    /></ToastProvider>)

    expect(screen.getByRole('heading', { name: 'Permit number' })).toBeInTheDocument()
    expect(screen.getByText('P-100')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'www.google.com' })
    expect(link).toHaveAttribute('href', 'https://www.google.com')
    expect(screen.queryByRole('heading', { name: 'Empty field' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Time & Cost Tracking' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Permit number' }).compareDocumentPosition(screen.getByRole('heading', { name: 'Time & Cost Tracking' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('copies the current Work Order URL using the Link icon', async () => {
    let resolveWriteText
    const writeText = vi.fn(() => new Promise((resolve) => { resolveWriteText = resolve }))
    clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const { container } = render(<ToastProvider><WorkOrderDetail selected={selected} grants={{}} /></ToastProvider>)
    const copyButton = screen.getByRole('button', { name: 'Copy Work Order link' })

    expect(copyButton.querySelector('svg.lucide-link')).toBeInTheDocument()
    fireEvent.click(copyButton)

    expect(screen.queryByText('Work Order link copied.')).not.toBeInTheDocument()
    resolveWriteText()
    expect(await screen.findByRole('status')).toHaveTextContent('Work Order link copied.')
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/workorders/wo-1`)
    expect(container.querySelector('svg.lucide-link-2')).not.toBeInTheDocument()
  })

  it('shows an error toast when copying the Work Order URL fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard unavailable'))
    clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    render(<ToastProvider><WorkOrderDetail selected={selected} grants={{}} /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Copy Work Order link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to copy Work Order link.')
  })

  it('shows an internal review notice when an external contact requests completion', () => {
    render(<ToastProvider><WorkOrderDetail selected={{ ...selected, external_finished_at: '2026-10-14T18:00:00.000Z', external_finished_by_name: 'Vendor Contact' }} grants={{}} /></ToastProvider>)

    expect(screen.getByRole('status')).toHaveTextContent('External completion requested')
    expect(screen.getByRole('status')).toHaveTextContent('Vendor Contact marked this Work Order finished')
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('creates and copies an external link without rotating it on repeated copies', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const onGetExternalShare = vi.fn().mockResolvedValue({ enabled: false, shareId: null })
    const onCreateExternalShare = vi.fn().mockResolvedValue({ enabled: true, token: 'a'.repeat(64), shareId: 'share-1' })
    const onSaveExternalShareContacts = vi.fn().mockResolvedValue([{ displayName: '', vendorName: 'Acme Services', email: 'vendor@example.com' }])
    render(<ToastProvider><WorkOrderDetail selected={selected} grants={{}} externalSharingEnabled canShareExternally onGetExternalShare={onGetExternalShare} onCreateExternalShare={onCreateExternalShare} onDisableExternalShare={vi.fn()} onResetExternalShare={vi.fn()} onSaveExternalShareContacts={onSaveExternalShareContacts} /></ToastProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Share externally' }))
    const shareDialog = await screen.findByRole('dialog', { name: 'Share "Replace filter"' })
    expect(shareDialog).toHaveClass('responsive-dialog', 'is-mobile-page', 'external-work-order-share-dialog')
    expect(shareDialog.querySelector('.mobile-app-header')).toHaveClass('is-page-header')
    expect(shareDialog.querySelector('.mobile-app-header-title')).toHaveTextContent('Share "Replace filter"')
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('External access is limited to this Work Order.')
    expect(screen.getByRole('button', { name: 'About external links' })).toHaveAttribute('aria-describedby', 'external-work-order-share-help-text')

    fireEvent.click(screen.getByRole('switch', { name: 'Enable External Link' }))
    await waitFor(() => expect(onCreateExternalShare).toHaveBeenCalledWith('wo-1'))
    expect(await screen.findByRole('button', { name: 'Copy External Link' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copy External Link' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
    expect(onCreateExternalShare).toHaveBeenCalledTimes(1)

    expect(screen.getByRole('heading', { name: 'Vendor Contacts' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save vendor contacts' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Company name'), { target: { value: 'Acme Services' } })
    fireEvent.change(screen.getByPlaceholderText('vendor@example.com'), { target: { value: 'vendor@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(onSaveExternalShareContacts).toHaveBeenCalledWith('wo-1', [{ displayName: '', vendorName: 'Acme Services', email: 'vendor@example.com' }]))
  })

  it('opens the PDF export dialog from the detail actions menu', () => {
    render(<WorkOrderDetail selected={selected} grants={{}} onToggleRead={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    const exportAction = screen.getByRole('menuitem', { name: 'Export to PDF' })
    expect(exportAction).toBeEnabled()
    fireEvent.click(exportAction)

    expect(screen.getByRole('dialog', { name: 'Export Work Order as PDF' })).toBeInTheDocument()
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
    const { container } = render(<WorkOrderDetail selected={selected} userId="user-a" grants={{
      'work_orders.change_status': 'own',
      'work_orders.view_comments': 'own',
    }} onStatusChange={onStatusChange} />)

    expect(container.querySelector('.detail-meta')).toHaveTextContent(`Due by ${selected.due}`)
    expect(container.querySelector('.detail-meta')).not.toHaveTextContent(`#${selected.work_order_number}`)
    expect(screen.getByRole('group', { name: 'Work Order status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Due Date' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Priority' })).toBeInTheDocument()
    expect(container.querySelector('.detail-fact--work-order-id .detail-fact-value')).toHaveTextContent('#41')
    const assetAttribute = screen.getByRole('heading', { name: 'Asset' }).closest('.detail-attribute')
    expect(assetAttribute.querySelector('svg.lucide-boxes')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Assigned To' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Description' })).toBeInTheDocument()
    expect(container.querySelector('.detail-mobile-toolbar .detail-mobile-number')).toHaveTextContent('#41')
    expect(container.querySelector('.detail-mobile-record-title h1')).toHaveTextContent(selected.title)
    expect(container.querySelector('.detail-mobile-tabs')).toBeInTheDocument()
    expect(container.querySelector('.detail-description-media')).toBeInTheDocument()
    expect(container.querySelector('.detail-attachments-row')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onStatusChange).toHaveBeenCalledWith(selected, 'Completed')
  })

  it('shows overdue treatment for incomplete Work Orders past their due date', () => {
    const { container } = render(<ToastProvider><WorkOrderDetail selected={{
      ...selected,
      due: '10/08/2026',
      due_date: '2026-10-08',
    }} dateFormat="MM/DD/YYYY" grants={{}} /></ToastProvider>)

    expect(container.querySelector('.detail-meta')).toHaveTextContent('Overdue since 10/08/2026')
    expect(container.querySelector('.detail-meta')).toHaveClass('detail-meta--overdue')
    expect(container.querySelector('.detail-fact--due-date .detail-fact-value')).toHaveTextContent('10/08/2026')
    expect(container.querySelector('.detail-overdue-indicator')).toHaveTextContent('Overdue')
  })

  it('does not show overdue treatment for completed Work Orders', () => {
    const { container } = render(<ToastProvider><WorkOrderDetail selected={{
      ...selected,
      status: 'Completed',
      due: '10/08/2026',
      due_date: '2026-10-08',
    }} dateFormat="MM/DD/YYYY" grants={{}} /></ToastProvider>)

    expect(container.querySelector('.detail-meta')).toHaveTextContent('Due by 10/08/2026')
    expect(container.querySelector('.detail-meta--overdue')).not.toBeInTheDocument()
    expect(container.querySelector('.detail-overdue-indicator')).not.toBeInTheDocument()
  })

  it('prioritizes only the first detail picture', () => {
    const { container } = render(<WorkOrderDetail selected={{
      ...selected,
      work_order_attachments: [
        { id: 'image-1', kind: 'image', signed_url: '/first.jpg', file_name: 'First image' },
        { id: 'image-2', kind: 'image', signed_url: '/second.jpg', file_name: 'Second image' },
      ],
    }} grants={{}} />)
    const firstImage = container.querySelector('.detail-attachment-image[src="/first.jpg"]')
    const secondImage = container.querySelector('.detail-attachment-image[src="/second.jpg"]')

    expect(firstImage).toHaveAttribute('loading', 'eager')
    expect(firstImage).toHaveAttribute('fetchpriority', 'high')
    expect(secondImage).toHaveAttribute('loading', 'lazy')
    expect(secondImage).not.toHaveAttribute('fetchpriority')
  })

  it('supports swipe and button navigation for the mobile picture carousel', () => {
    const { container } = render(<WorkOrderDetail selected={{
      ...selected,
      work_order_attachments: [
        { id: 'image-1', kind: 'image', signed_url: '/first.jpg', file_name: 'First image' },
        { id: 'image-2', kind: 'image', signed_url: '/second.jpg', file_name: 'Second image' },
        { id: 'image-3', kind: 'image', signed_url: '/third.jpg', file_name: 'Third image' },
      ],
    }} grants={{}} />)
    const carousel = container.querySelector('.detail-attachment-carousel')
    const track = container.querySelector('.detail-attachment-list')
    const nextButton = within(carousel).getByRole('button', { name: 'Next picture' })

    const indicators = within(carousel).getAllByRole('tab')
    expect(indicators).toHaveLength(3)
    expect(indicators[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(nextButton)
    expect(indicators[1]).toHaveAttribute('aria-selected', 'true')
    expect(track.style.getPropertyValue('--detail-carousel-index')).toBe('2')

    fireEvent.touchStart(carousel, { touches: [{ clientX: 240 }] })
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 100 }] })
    expect(indicators[2]).toHaveAttribute('aria-selected', 'true')
    expect(track.style.getPropertyValue('--detail-carousel-index')).toBe('3')

    fireEvent.click(within(carousel).getByRole('button', { name: 'Next picture' }))
    expect(indicators[0]).toHaveAttribute('aria-selected', 'true')
    expect(track.style.getPropertyValue('--detail-carousel-index')).toBe('4')
    fireEvent.transitionEnd(track, { propertyName: 'transform' })
    expect(track.style.getPropertyValue('--detail-carousel-index')).toBe('1')
  })

  it('shows two pictures per slide on tablet viewports', () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(min-width: 701px) and (max-width: 1199px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const { container } = render(<WorkOrderDetail selected={{
      ...selected,
      work_order_attachments: [
        { id: 'image-1', kind: 'image', signed_url: '/first.jpg', file_name: 'First image' },
        { id: 'image-2', kind: 'image', signed_url: '/second.jpg', file_name: 'Second image' },
        { id: 'image-3', kind: 'image', signed_url: '/third.jpg', file_name: 'Third image' },
      ],
    }} grants={{}} />)
    const carousel = container.querySelector('.detail-attachment-carousel')
    const track = container.querySelector('.detail-attachment-list')

    const indicators = within(carousel).getAllByRole('tab')
    expect(indicators).toHaveLength(2)
    expect(indicators[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(within(carousel).getByRole('button', { name: 'Next picture' }))
    expect(indicators[1]).toHaveAttribute('aria-selected', 'true')
    expect(track.style.getPropertyValue('--detail-carousel-index')).toBe('3')

    fireEvent.click(within(carousel).getByRole('button', { name: 'Next picture' }))
    expect(indicators[0]).toHaveAttribute('aria-selected', 'true')
    expect(track.style.getPropertyValue('--detail-carousel-index')).toBe('5')
    fireEvent.transitionEnd(track, { propertyName: 'transform' })
    expect(track.style.getPropertyValue('--detail-carousel-index')).toBe('2')
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

  it('shows recurrence chain actions for repeating Work Orders', async () => {
    const onGoToMostRecentInChain = vi.fn().mockResolvedValue(undefined)
    const onStopRepeating = vi.fn().mockResolvedValue(undefined)
    const recurring = {
      ...selected,
      recurrence_rule: { frequency: 'yearly', interval: 1 },
      recurrence_series_id: 'series-1',
      recurrence_sequence: 2,
    }
    render(<WorkOrderDetail
      selected={recurring}
      userId="user-a"
      grants={{ 'work_orders.edit': 'own', 'work_orders.cancel_skip': 'own' }}
      onGoToMostRecentInChain={onGoToMostRecentInChain}
      onStopRepeating={onStopRepeating}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Go to Most Recent in Chain' }))
    await waitFor(() => expect(onGoToMostRecentInChain).toHaveBeenCalledWith(recurring))

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    expect(screen.getByRole('menuitem', { name: 'Skip Work Order' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Cancel Work Order' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Stop Repeating' }))
    await waitFor(() => expect(onStopRepeating).toHaveBeenCalledWith(recurring))
  })

  it('shows Cancel instead of Skip for non-recurring Work Orders', () => {
    render(<WorkOrderDetail selected={selected} userId="user-a" grants={{ 'work_orders.cancel_skip': 'own' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    expect(screen.getByRole('menuitem', { name: 'Cancel Work Order' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Skip Work Order' })).not.toBeInTheDocument()
  })

  it('hides Skip and Cancel for terminal Work Orders', () => {
    render(<WorkOrderDetail selected={{ ...selected, status: 'Skipped' }} userId="user-a" grants={{ 'work_orders.cancel_skip': 'own' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    expect(screen.queryByRole('menuitem', { name: 'Skip Work Order' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Cancel Work Order' })).not.toBeInTheDocument()
  })

  it('uses the app confirmation dialog before deleting a Work Order', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(<WorkOrderDetail selected={{ ...selected, status: 'Completed' }} userId="user-a" grants={{ 'work_orders.delete': 'own' }} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog', { name: 'Delete Work Order?' })).toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: selected.id })))
  })

  it('includes the remaining reference sections without claiming unsupported features', async () => {
    render(<WorkOrderDetail selected={{ ...selected, estimated_duration_minutes: 60 }} userId="user-a" workOrderSettings={{ enableCostTracking: true, enableTimeTracking: true, enableParts: true }} grants={{
      'work_orders.view_comments': 'own',
    }} />)

    expect(screen.getByRole('heading', { name: 'Asset' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Location' })).toBeInTheDocument()
    expect(screen.getByText('1h')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Time & Cost Tracking' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Comments' })).toBeInTheDocument()
    expect(within(screen.getByText('Parts').closest('.detail-cost-row')).getByRole('button', { name: /Add/ })).toBeDisabled()
    const timeSummary = screen.getByText('Time').closest('.work-order-time-summary')
    await waitFor(() => expect(within(timeSummary).getByRole('button', { name: /Add/ })).not.toBeDisabled())
    expect(screen.getAllByRole('button', { name: /Add/ })).toHaveLength(3)
    expect(within(timeSummary).getByRole('button', { name: /Add/ }).querySelector('svg.lucide-chevron-right')).toBeInTheDocument()
    expect(timeSummary.querySelector('.work-order-time-overview-value-link')).not.toBeInTheDocument()
    expect(within(screen.getByText('Other Costs').closest('.work-order-cost-summary')).getByRole('button', { name: /Add/ })).not.toBeDisabled()
  })

  it.each([
    ['cost', { enableCostTracking: true, enableTimeTracking: false, enableParts: false }, ['Other Costs'], ['Time', 'Parts']],
    ['time', { enableCostTracking: false, enableTimeTracking: true, enableParts: false }, ['Time'], ['Other Costs', 'Parts']],
    ['parts', { enableCostTracking: false, enableTimeTracking: false, enableParts: true }, ['Parts'], ['Time', 'Other Costs']],
  ])('shows only the enabled %s tracking category', (_, settings, visibleLabels, hiddenLabels) => {
    render(<WorkOrderDetail selected={selected} workOrderSettings={settings} grants={{}} />)

    expect(screen.getByRole('heading', { name: 'Time & Cost Tracking' })).toBeInTheDocument()
    visibleLabels.forEach((label) => expect(screen.getByText(label)).toBeInTheDocument())
    hiddenLabels.forEach((label) => expect(screen.queryByText(label)).not.toBeInTheDocument())
  })

  it('hides the complete Time & Cost Tracking section when all categories are disabled', () => {
    render(<WorkOrderDetail selected={selected} workOrderSettings={{
      enableCostTracking: false,
      enableTimeTracking: false,
      enableParts: false,
      requireCostTracking: true,
      requireTimeTracking: true,
      requireParts: true,
    }} grants={{}} />)

    expect(screen.queryByRole('heading', { name: 'Time & Cost Tracking' })).not.toBeInTheDocument()
  })

  it('scrolls to comments inside the detail pane without scrolling the outer page', () => {
    const { container } = render(<div className="page-content"><WorkOrderDetail selected={selected} userId="user-a" grants={{
      'work_orders.view_comments': 'own',
    }} /></div>)
    const detailScroll = container.querySelector('.detail-scroll')
    const commentsSection = container.querySelector('.detail-comments-section')
    const pageContent = container.querySelector('.page-content')
    const detailScrollTo = vi.fn()
    const pageScrollTo = vi.fn()
    const commentsScrollIntoView = vi.fn()

    detailScroll.scrollTop = 40
    commentsSection.style.scrollMarginTop = '16px'
    vi.spyOn(detailScroll, 'getBoundingClientRect').mockReturnValue({ top: 100 })
    vi.spyOn(commentsSection, 'getBoundingClientRect').mockReturnValue({ top: 340 })
    Object.defineProperty(detailScroll, 'scrollTo', { configurable: true, value: detailScrollTo })
    Object.defineProperty(pageContent, 'scrollTo', { configurable: true, value: pageScrollTo })
    Object.defineProperty(commentsSection, 'scrollIntoView', { configurable: true, value: commentsScrollIntoView })

    fireEvent.click(container.querySelector('.detail-comments-action'))

    expect(detailScrollTo).toHaveBeenCalledWith({ top: 264, behavior: 'smooth' })
    expect(pageScrollTo).not.toHaveBeenCalled()
    expect(commentsScrollIntoView).not.toHaveBeenCalled()
  })

  it('keeps the mobile record title in the non-scrolling header when comments are opened', () => {
    const { container } = render(<WorkOrderDetail selected={selected} userId="user-a" grants={{
      'work_orders.view_comments': 'own',
    }} />)
    const detailScroll = container.querySelector('.detail-scroll')
    Object.defineProperty(detailScroll, 'scrollTo', { configurable: true, value: vi.fn() })

    fireEvent.click(container.querySelector('.detail-mobile-tabs button[aria-selected="false"]'))

    const mobileHeader = container.querySelector('.detail-mobile-record-header')
    expect(mobileHeader).toContainElement(container.querySelector('.detail-mobile-record-title h1'))
    expect(mobileHeader).toContainElement(container.querySelector('.detail-mobile-tabs'))
    expect(container.querySelector('.detail-mobile-tabs button[aria-selected="true"]')).toHaveTextContent('Comments')
    expect(container.querySelector('.detail-pane')).toHaveClass('is-mobile-comments-view')
    expect(container.querySelector('.detail-mobile-details-content')).toBeInTheDocument()
    expect(container.querySelector('.detail-mobile-comments-content')).toBeInTheDocument()
  })

  it('does not render a timer action in the mobile comments view', () => {
    const { container } = render(<WorkOrderDetail selected={selected} userId="user-a" workOrderSettings={{ enableTimeTracking: true }} grants={{
      'work_orders.view_comments': 'own',
    }} />)
    const detailScroll = container.querySelector('.detail-scroll')
    Object.defineProperty(detailScroll, 'scrollTo', { configurable: true, value: vi.fn() })

    fireEvent.click(container.querySelector('.detail-mobile-tabs button[aria-selected="false"]'))

    const commentsContent = container.querySelector('.detail-mobile-comments-content')
    expect(within(commentsContent).queryByRole('button', { name: 'Start Timer' })).not.toBeInTheDocument()
    expect(container.querySelector('.detail-mobile-details-content .work-order-time-tracking')).toBeInTheDocument()
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
    expect(menu.querySelectorAll('button.is-unavailable svg')).toHaveLength(5)

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Mark as unread' }))
    expect(onToggleRead).toHaveBeenCalledWith(selected)
  })

  it('opens the standard mobile action sheet from the ellipsis on mobile viewports', () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(max-width: 840px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const onCopy = vi.fn()
    render(<WorkOrderDetail selected={selected} userId="user-a" grants={{
      'work_orders.create': 'own',
    }} onCopy={onCopy} />)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    const sheet = screen.getByRole('dialog', { name: 'Work Order actions' })
    expect(sheet).toBeInTheDocument()
    expect(sheet).toHaveClass('mobile-action-sheet-menu')
    expect(screen.queryByRole('menu', { name: 'Work Order actions' })).not.toBeInTheDocument()

    fireEvent.click(within(sheet).getByRole('button', { name: 'Copy to New Work Order' }))
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('keeps unavailable mobile actions visibly locked', () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(max-width: 840px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    render(<WorkOrderDetail selected={selected} grants={{}} onToggleRead={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'More work order actions' }))
    const sheet = screen.getByRole('dialog', { name: 'Work Order actions' })
    expect(within(sheet).getByRole('button', { name: 'Copy to New Work Order' })).toBeDisabled()
    expect(within(sheet).getByRole('button', { name: 'Save as Work Order Template' })).toBeDisabled()
    expect(within(sheet).getByRole('button', { name: 'Save as Work Order Template' }).querySelector('svg.lucide-lock-keyhole')).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Delete' }).querySelector('svg.lucide-lock-keyhole')).toBeInTheDocument()
  })
})
