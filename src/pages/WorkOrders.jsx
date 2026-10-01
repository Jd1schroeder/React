import { useEffect, useMemo, useState } from 'react'
import { PanelLeft, UsersRound } from 'lucide-react'
import './WorkOrders.css'
import { PanelLayout } from '../components/layout/PanelLayout'
import { WorkOrderDetail } from './work-orders/WorkOrderDetail'
import { WorkOrderFilters, WorkOrderList } from './work-orders/WorkOrderList'
import { hasPermission } from '../services/authorizationService'
import { listOrganizationMembers, listOrganizationTeamMemberships, listOrganizationTeams } from '../services/organizationService'
import { useWorkspace } from '../components/layout/useWorkspace'
import { createWorkOrder, listWorkOrders, updateWorkOrderExecution } from '../services/workOrderService'
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
  const [workOrders, setWorkOrders] = useState([])
  const [localSelectedId, setLocalSelectedId] = useState()
  const [search, setSearch] = useState('')
  const [loadState, setLoadState] = useState('loading')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const [assigneeOptions, setAssigneeOptions] = useState([])
  const isLoading = canViewWorkOrders && loadState === 'loading'
  const selectedId = recordId ?? localSelectedId
  useEffect(() => {
    if (!canViewWorkOrders || !organizationId) {
      return undefined
    }
    let active = true
    listWorkOrders(organizationId, grants)
      .then((orders) => { if (active) setWorkOrders(orders.map((order) => normalizeWorkOrder(order, workspace.preferences))) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load Work Orders.') })
      .finally(() => { if (active) setLoadState('ready') })
    return () => { active = false }
  }, [canViewWorkOrders, grants, organizationId, workspace.preferences])
  const visibleOrders = useMemo(() => {
    const tabOrders = activeTab === 'Done' ? workOrders.filter((order) => order.status === 'Completed') : workOrders.filter((order) => order.status !== 'Completed')
    const normalizedSearch = search.trim().toLowerCase()
    return normalizedSearch ? tabOrders.filter((order) => `${order.title} ${order.id} ${order.location}`.toLowerCase().includes(normalizedSearch)) : tabOrders
  }, [activeTab, search, workOrders])
  const selected = recordId ? workOrders.find((order) => order.id === selectedId) : visibleOrders[0] ?? workOrders[0]
  const missingRecord = Boolean(recordId && !selected)
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
  const markDone = async () => {
    if (!organizationId || !selected) return
    try {
      const updated = normalizeWorkOrder(await updateWorkOrderExecution({ organizationId, workOrderId: selected.id, status: 'Completed', grants, record: { userId, ownerId: selected.created_by, assigneeId: selected.assigned_to, assigneeIds: selected.work_order_assignments?.map((assignment) => assignment.user_id).filter(Boolean), teamId: selected.team_id, assignedTeamIds: selected.work_order_assignments?.map((assignment) => assignment.team_id).filter(Boolean), teamIds } }), workspace.preferences)
      setWorkOrders((current) => current.map((order) => order.id === updated.id ? updated : order))
    } catch (updateError) { setError(updateError.message || 'Unable to update this Work Order.') }
  }
  const handleCreate = async (values) => {
    if (!organizationId) return
    setIsSaving(true)
    setCreateError('')
    try {
      const created = normalizeWorkOrder(await createWorkOrder({ organizationId, ...values, grants }), workspace.preferences)
      setWorkOrders((current) => [created, ...current])
      setIsCreating(false)
      setLocalSelectedId(created.id)
    } catch (createLoadError) {
      setCreateError(createLoadError.message || 'Unable to create this Work Order.')
    } finally {
      setIsSaving(false)
    }
  }

  return <PanelLayout title="Work orders" modeIcon={PanelLeft} searchValue={search} onSearch={setSearch} searchPlaceholder="Search Work Orders" actionLabel="New work order" onAction={() => { setCreateError(''); setIsCreating(true) }} showHeaderSearch={canViewWorkOrders} showAction={canCreateWorkOrders} className="work-orders-page" bodyClassName="work-orders-layout" subnavigation={canViewWorkOrders ? <WorkOrderFilters /> : null}>
    {isLoading && <div className="work-orders-loading">Loading Work Orders...</div>}
    {!isLoading && error && <div className="work-orders-loading" role="alert">{error}</div>}
    {!isLoading && !error && !canViewWorkOrders && <div className="work-orders-loading" role="status">You do not have permission to view Work Orders.</div>}
    {!isLoading && !error && canViewWorkOrders && <><WorkOrderList activeTab={activeTab} setActiveTab={setActiveTab} visibleOrders={visibleOrders} selected={selected} onSelect={(order) => { setIsCreating(false); setLocalSelectedId(order.id); onNavigateRecord?.('workorders', order.id) }} />{isCreating ? <NewWorkOrderForm onCancel={() => setIsCreating(false)} onCreate={handleCreate} isSaving={isSaving} error={createError} assigneeOptions={assigneeOptions} canAssign={canAssignWorkOrders} dateFormat={workspace.preferences?.date_format} /> : <WorkOrderDetail selected={selected} missingRecord={missingRecord} onMarkDone={markDone} grants={grants} userId={userId} teamIds={teamIds} />}</>}
  </PanelLayout>
}
