import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, PanelLeft, UsersRound, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import './WorkOrders.css'
import { PanelLayout } from '../components/layout/PanelLayout'
import { WorkOrderDetail } from './work-orders/WorkOrderDetail'
import { WorkOrderFilters, WorkOrderList } from './work-orders/WorkOrderList'
import { canAccessRecord, hasPermission } from '../services/authorizationService'
import { listOrganizationMembers, listOrganizationTeamMemberships, listOrganizationTeams } from '../services/organizationService'
import { useWorkspace } from '../components/layout/useWorkspace'
import { createWorkOrder, getWorkOrderById, listWorkOrderInboxCounts, listWorkOrderInboxPage, markWorkOrderInboxRead, markWorkOrderRead, markWorkOrderUnread, updateWorkOrderExecution } from '../services/workOrderService'
import { NewWorkOrderForm } from './work-orders/NewWorkOrderForm'
import { formatCalendarDateForUser, formatDateForUser } from '../utils/dateFormatting'

function normalizeWorkOrder(order, preferences = {}) {
  const assignments = order.work_order_assignments ?? []
  const hasUserAssignment = assignments.some((assignment) => assignment.user_id) || Boolean(order.assigned_to)
  const hasTeamAssignment = assignments.some((assignment) => assignment.team_id) || Boolean(order.team_id)
  const dueDate = order.due_date
    ? formatCalendarDateForUser(order.due_date, preferences.date_format)
    : order.due_at ? formatDateForUser(order.due_at, preferences.date_format, preferences.timezone) : 'No due date'
  return {
    ...order,
    due: `${dueDate}${order.due_time ? ` ${order.due_time.slice(0, 5)}` : ''}`,
    requester: order.requester_id ? 'Requester' : 'Not available',
    location: 'Not available',
    workType: order.work_type === 'preventive' ? 'Preventive' : 'Reactive',
    asset: 'Not available',
    assignee: hasUserAssignment ? 'Assigned user' : 'Unassigned',
    assignedTeam: hasTeamAssignment ? 'Assigned team' : 'Unassigned',
  }
}

function memberName(member) {
  return [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(' ') || member.email || member.contact_value || 'Unnamed user'
}

export function WorkOrders({ recordId, onNavigateRecord }) {
  const workspace = useWorkspace()
  const organizationId = workspace.organization?.id ?? ''
  const grants = useMemo(() => workspace.authorization?.grants ?? {}, [workspace.authorization?.grants])
  const teamIds = useMemo(() => workspace.teamIds ?? [], [workspace.teamIds])
  const assignScope = grants['work_orders.assign']
  const canAssignWorkOrders = Boolean(assignScope)
  const canViewWorkOrders = workspace.authorization?.status === 'ready' && hasPermission(grants, 'work_orders.view')
  const canCreateWorkOrders = canViewWorkOrders && hasPermission(grants, 'work_orders.create')
  const userId = workspace.user?.id
  const [activeTab, setActiveTab] = useState('To Do')
  const [unreadFirst, setUnreadFirst] = useState(false)
  const [workOrdersById, setWorkOrdersById] = useState({})
  const [groupCounts, setGroupCounts] = useState({})
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [localSelectedId, setLocalSelectedId] = useState()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loadState, setLoadState] = useState('loading')
  const [error, setError] = useState('')
  const [readError, setReadError] = useState('')
  const [isReadAllConfirmOpen, setIsReadAllConfirmOpen] = useState(false)
  const [readToast, setReadToast] = useState('')
  const [isSavingReadState, setIsSavingReadState] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const [assigneeOptions, setAssigneeOptions] = useState([])
  const pendingReadIds = useRef(new Set())
  const isLoading = canViewWorkOrders && loadState === 'loading'
  const selectedId = recordId ?? localSelectedId
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(timeout)
  }, [search])
  useEffect(() => {
    if (!canViewWorkOrders || !organizationId) {
      return undefined
    }
    let active = true
    listWorkOrderInboxCounts({ organizationId, tab: activeTab, search: debouncedSearch, grants })
      .then((counts) => { if (active) setGroupCounts(counts) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load Work Orders.') })
      .finally(() => { if (active) setLoadState('ready') })
    return () => { active = false }
  }, [activeTab, canViewWorkOrders, debouncedSearch, grants, organizationId, refreshVersion])
  const selected = workOrdersById[selectedId]
  const missingRecord = Boolean(recordId && !selected)
  const markViewed = useCallback(async (order) => {
    if (!order || (workOrdersById[order.id]?.is_read ?? order.is_read) || pendingReadIds.current.has(order.id)) return
    pendingReadIds.current.add(order.id)
    try {
      await markWorkOrderRead({ workOrderId: order.id, grants })
      setWorkOrdersById((current) => ({ ...current, [order.id]: { ...current[order.id], is_read: true } }))
      if (unreadFirst) setRefreshVersion((version) => version + 1)
      setReadError('')
    } catch (readFailure) {
      setReadError(readFailure.message || 'Unable to save Work Order review status.')
    } finally {
      pendingReadIds.current.delete(order.id)
    }
  }, [grants, unreadFirst, workOrdersById])
  const toggleReadState = async (order) => {
    if (!order || isSavingReadState) return
    setIsSavingReadState(true)
    setReadError('')
    try {
      if (workOrdersById[order.id]?.is_read ?? order.is_read) {
        await markWorkOrderUnread({ workOrderId: order.id, grants })
        setWorkOrdersById((current) => ({ ...current, [order.id]: { ...current[order.id], is_read: false } }))
      } else {
        await markWorkOrderRead({ workOrderId: order.id, grants })
        setWorkOrdersById((current) => ({ ...current, [order.id]: { ...current[order.id], is_read: true } }))
      }
      if (unreadFirst) setRefreshVersion((version) => version + 1)
    } catch (readFailure) {
      setReadError(readFailure.message || 'Unable to update Work Order review status.')
    } finally {
      setIsSavingReadState(false)
    }
  }
  const readAll = async () => {
    setIsSavingReadState(true)
    setReadError('')
    try {
      await markWorkOrderInboxRead({ organizationId, tab: activeTab, search: debouncedSearch, grants })
      const normalizedSearch = debouncedSearch.trim().toLowerCase()
      setWorkOrdersById((current) => Object.fromEntries(Object.entries(current).map(([id, order]) => {
        const inTab = activeTab === 'Done' ? order.status === 'Completed' : order.status !== 'Completed'
        const matchesSearch = !normalizedSearch || `${order.title} ${order.id} ${order.work_order_number}`.toLowerCase().includes(normalizedSearch)
        return [id, inTab && matchesSearch ? { ...order, is_read: true } : order]
      })))
      const tabLabel = activeTab === 'Done' ? 'Done' : 'To Do'
      const searchLabel = debouncedSearch.trim() ? 'matching ' : ''
      setReadToast(`All ${searchLabel}${tabLabel} Work Orders have been marked as read.`)
      setRefreshVersion((version) => version + 1)
      return true
    } catch (readFailure) {
      setReadError(readFailure.message || 'Unable to mark Work Orders as read.')
      return false
    } finally {
      setIsSavingReadState(false)
    }
  }
  const confirmReadAll = async () => {
    if (await readAll()) setIsReadAllConfirmOpen(false)
  }
  useEffect(() => {
    if (!readToast) return undefined
    const timeout = window.setTimeout(() => setReadToast(''), 5000)
    return () => window.clearTimeout(timeout)
  }, [readToast])
  useEffect(() => {
    if (!isReadAllConfirmOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSavingReadState) setIsReadAllConfirmOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isReadAllConfirmOpen, isSavingReadState])
  useEffect(() => {
    if (!recordId || !canViewWorkOrders || !organizationId || workOrdersById[recordId]) return undefined
    let active = true
    getWorkOrderById({ organizationId, workOrderId: recordId, grants })
      .then((order) => {
        if (!active || !order) return
        const normalized = normalizeWorkOrder(order, workspace.preferences)
        setWorkOrdersById((current) => ({ ...current, [order.id]: normalized }))
        void markViewed(normalized)
      })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load this Work Order.') })
    return () => { active = false }
  }, [canViewWorkOrders, grants, markViewed, organizationId, recordId, workOrdersById, workspace.preferences])
  const loadGroupPage = async ({ tab, group, sort, unreadFirst, offset }) => {
    const orders = await listWorkOrderInboxPage({ organizationId, tab, group, search: debouncedSearch, sort, unreadFirst, offset, grants })
    return orders.map((order) => normalizeWorkOrder(order, workspace.preferences))
  }
  const storeOrders = (orders) => {
    setWorkOrdersById((current) => ({ ...current, ...Object.fromEntries(orders.map((order) => [order.id, order])) }))
    if (!recordId && !localSelectedId && orders[0]) {
      setLocalSelectedId(orders[0].id)
      void markViewed(orders[0])
    }
  }
  const selectOrder = (order) => {
    setIsCreating(false)
    setLocalSelectedId(order.id)
    onNavigateRecord?.('workorders', order.id)
    void markViewed(order)
  }
  useEffect(() => {
    if (!organizationId) return undefined
    let active = true
    Promise.all([
      listOrganizationMembers(organizationId),
      canAssignWorkOrders ? listOrganizationTeams(organizationId) : Promise.resolve([]),
      canAssignWorkOrders ? listOrganizationTeamMemberships(organizationId) : Promise.resolve([]),
    ])
      .then(([members, teams, teamMemberships]) => {
        if (!active) return
        const assignableTeamIds = assignScope === 'team' ? new Set(teamIds) : null
        const usersOnAssignableTeams = new Set(teamMemberships
          .filter((membership) => !assignableTeamIds || assignableTeamIds.has(membership.team_id))
          .map((membership) => membership.user_id))
        setAssigneeOptions(
          members
            .filter((member) => member.status === 'active' && member.user_id && (assignScope !== 'team' || usersOnAssignableTeams.has(member.user_id)))
            .sort((first, second) => memberName(first).localeCompare(memberName(second)))
            .map((member) => ({
              value: `user:${member.user_id}`,
              label: memberName(member),
              avatar: {
                src: member.profile?.avatar_url?.startsWith('http') ? member.profile.avatar_url : '',
                firstName: member.profile?.first_name,
                lastName: member.profile?.last_name,
                name: memberName(member),
              },
            }))
            .concat(teams
              .filter((team) => !assignableTeamIds || assignableTeamIds.has(team.id))
              .map((team) => ({ value: `team:${team.id}`, label: team.name, icon: UsersRound }))),
        )
      })
      .catch(() => {
        if (active) setAssigneeOptions([])
      })
    return () => { active = false }
  }, [assignScope, canAssignWorkOrders, organizationId, teamIds])
  const changeStatus = async (order, status) => {
    if (!organizationId || !order) return
    try {
      const updated = normalizeWorkOrder(await updateWorkOrderExecution({ organizationId, workOrderId: order.id, status, grants, record: { userId, ownerId: order.created_by, assigneeId: order.assigned_to, assigneeIds: order.work_order_assignments?.map((assignment) => assignment.user_id).filter(Boolean), teamId: order.team_id, assignedTeamIds: order.work_order_assignments?.map((assignment) => assignment.team_id).filter(Boolean), teamIds } }), workspace.preferences)
      setWorkOrdersById((current) => ({ ...current, [updated.id]: updated }))
      setRefreshVersion((version) => version + 1)
      return updated
    } catch (updateError) {
      setError(updateError.message || 'Unable to update this Work Order.')
      throw updateError
    }
  }
  const markDone = async () => { if (selected) await changeStatus(selected, 'Completed') }
  const canChangeStatusForOrder = (order) => canAccessRecord(grants, 'work_orders.change_status', {
    userId,
    ownerId: order.created_by,
    assigneeId: order.assigned_to,
    assigneeIds: order.work_order_assignments?.map((assignment) => assignment.user_id).filter(Boolean),
    teamId: order.team_id,
    assignedTeamIds: order.work_order_assignments?.map((assignment) => assignment.team_id).filter(Boolean),
    teamIds,
  })
  const handleCreate = async (values) => {
    if (!organizationId) return
    setIsSaving(true)
    setCreateError('')
    try {
      const created = normalizeWorkOrder(await createWorkOrder({ organizationId, ...values, grants }), workspace.preferences)
      setWorkOrdersById((current) => ({ ...current, [created.id]: created }))
      setIsCreating(false)
      setLocalSelectedId(created.id)
      void markViewed(created)
      setRefreshVersion((version) => version + 1)
    } catch (createLoadError) {
      setCreateError(createLoadError.message || 'Unable to create this Work Order.')
    } finally {
      setIsSaving(false)
    }
  }

  return <>
  <PanelLayout title="Work orders" modeIcon={PanelLeft} searchValue={search} onSearch={setSearch} searchPlaceholder="Search Work Orders" actionLabel="New work order" onAction={() => { setCreateError(''); setIsCreating(true) }} showHeaderSearch={canViewWorkOrders} showAction={canCreateWorkOrders} className="work-orders-page" bodyClassName="work-orders-layout" subnavigation={canViewWorkOrders ? <WorkOrderFilters /> : null}>
    {isLoading && <div className="work-orders-loading">Loading Work Orders...</div>}
    {!isLoading && error && <div className="work-orders-loading" role="alert">{error}</div>}
    {!isLoading && !error && !canViewWorkOrders && <div className="work-orders-loading" role="status">You do not have permission to view Work Orders.</div>}
    {!isLoading && !error && canViewWorkOrders && <>{readError && <div className="work-orders-loading" role="alert">{readError}</div>}<WorkOrderList activeTab={activeTab} setActiveTab={setActiveTab} search={debouncedSearch} groupCounts={groupCounts} readStatusById={workOrdersById} selected={selected} onOrdersLoaded={storeOrders} onLoadGroupPage={loadGroupPage} refreshVersion={refreshVersion} onSelect={selectOrder} onStatusChange={changeStatus} onReadAll={() => { setReadError(''); setIsReadAllConfirmOpen(true) }} isReadAllSaving={isSavingReadState || search !== debouncedSearch} canChangeStatusForOrder={canChangeStatusForOrder} unreadFirst={unreadFirst} onUnreadFirstChange={setUnreadFirst} />{isCreating ? <NewWorkOrderForm onCancel={() => setIsCreating(false)} onCreate={handleCreate} isSaving={isSaving} error={createError} assigneeOptions={assigneeOptions} canAssign={canAssignWorkOrders} dateFormat={workspace.preferences?.date_format} /> : <WorkOrderDetail selected={selected} missingRecord={missingRecord} onMarkDone={markDone} onToggleRead={toggleReadState} isSavingReadState={isSavingReadState} grants={grants} userId={userId} teamIds={teamIds} />}</>}
  </PanelLayout>
  {isReadAllConfirmOpen && createPortal(<div className="work-order-read-confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSavingReadState) setIsReadAllConfirmOpen(false) }}>
    <section className="work-order-read-confirm" role="dialog" aria-modal="true" aria-labelledby="work-order-read-confirm-title">
      <button type="button" className="work-order-read-confirm-close" aria-label="Close confirmation" onClick={() => setIsReadAllConfirmOpen(false)} disabled={isSavingReadState}><X size={18} /></button>
      <p id="work-order-read-confirm-title">Are you sure you want to mark all {activeTab === 'Done' ? 'Done' : 'To Do'} Work Orders as read?</p>
      {readError && <p className="work-order-read-confirm-error" role="alert">{readError}</p>}
      <button type="button" className="work-order-read-confirm-primary" onClick={() => { void confirmReadAll() }} disabled={isSavingReadState}>{isSavingReadState ? 'Marking as read...' : 'Confirm'}</button>
      <button type="button" className="work-order-read-confirm-cancel" onClick={() => setIsReadAllConfirmOpen(false)} disabled={isSavingReadState}>Cancel</button>
    </section>
  </div>, document.body)}
  {readToast && createPortal(<div className="work-order-read-toast" role="status" aria-live="polite"><CheckCircle2 size={18} /><span>{readToast}</span><button type="button" onClick={() => setReadToast('')} aria-label="Dismiss notification"><X size={18} /></button></div>, document.body)}
  </>
}
