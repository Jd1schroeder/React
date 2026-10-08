import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, PanelLeft, UsersRound, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import './WorkOrders.css'
import { PanelLayout } from '../components/layout/PanelLayout'
import { useUnsavedChanges } from '../components/layout/useUnsavedChanges'
import { WorkOrderDetail } from './work-orders/WorkOrderDetail'
import { WorkOrderList } from './work-orders/WorkOrderList'
import { WorkOrderFilters } from './work-orders/WorkOrderFilters'
import { matchesWorkOrderFilters, normalizeWorkOrderFilters } from '../utils/workOrderFilters'
import { canAccessRecord, hasPermission } from '../services/authorizationService'
import { listOrganizationMembers, listOrganizationTeamMemberships, listOrganizationTeams } from '../services/organizationService'
import { useWorkspace } from '../components/layout/useWorkspace'
import { usePersistedFilterSelection } from '../hooks/usePersistedFilterSelection'
import { createWorkOrder, getWorkOrderById, listWorkOrderInboxCounts, listWorkOrderInboxPage, markWorkOrderInboxRead, markWorkOrderRead, markWorkOrderUnread, signWorkOrderAttachmentUrls, updateWorkOrderDetails, updateWorkOrderExecution } from '../services/workOrderService'
import { NewWorkOrderForm } from './work-orders/NewWorkOrderForm'
import { formatCalendarDateForUser, formatDateForUser } from '../utils/dateFormatting'
import { getWorkOrderInboxPreferences, saveWorkOrderInboxPreferences } from '../services/workOrderInboxPreferenceService'
import { createWorkOrderComment, deleteWorkOrderComment, getWorkOrderLinkPreviews, listWorkOrderActivity, updateWorkOrderComment } from '../services/workOrderCommentService'
import { createWorkOrderSavedFilter, deleteWorkOrderSavedFilter, listWorkOrderSavedFilters, updateWorkOrderSavedFilter } from '../services/workOrderSavedFilterService'

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

function assignmentKeys(assignments = []) {
  return assignments
    .map(({ userId, teamId }) => userId ? `user:${userId}` : teamId ? `team:${teamId}` : '')
    .filter(Boolean)
    .sort()
}

function workOrderAccessContext(order, userId, teamIds) {
  return {
    userId,
    ownerId: order.created_by,
    assigneeId: order.assigned_to,
    assigneeIds: order.work_order_assignments?.map((assignment) => assignment.user_id).filter(Boolean),
    teamId: order.team_id,
    assignedTeamIds: order.work_order_assignments?.map((assignment) => assignment.team_id).filter(Boolean),
    teamIds,
  }
}

export function WorkOrders({ recordId, onNavigateRecord, onNavigate }) {
  const location = useLocation()
  const navigate = useNavigate()
  const workspace = useWorkspace()
  const { guardNavigation, setHasUnsavedChanges } = useUnsavedChanges()
  const organizationId = workspace.organization?.id ?? ''
  const grants = useMemo(() => workspace.authorization?.grants ?? {}, [workspace.authorization?.grants])
  const teamIds = useMemo(() => workspace.teamIds ?? [], [workspace.teamIds])
  const assignScope = grants['work_orders.assign']
  const canAssignWorkOrders = Boolean(assignScope)
  const canViewWorkOrders = workspace.authorization?.status === 'ready' && hasPermission(grants, 'work_orders.view')
  const canCreateWorkOrders = canViewWorkOrders && hasPermission(grants, 'work_orders.create')
  const canSavePersonalWorkOrderFilters = canViewWorkOrders && hasPermission(grants, 'work_orders.manage_saved_filters')
  const canManageOrganizationWorkOrderFilters = workspace.organization?.roleDefinition?.system_key === 'organization_admin'
    || workspace.user?.app_metadata?.platform_role === 'superadmin'
  const userId = workspace.user?.id
  const canDeleteAnyWorkOrderComment = workspace.organization?.roleDefinition?.system_key === 'organization_admin'
    || workspace.user?.app_metadata?.platform_role === 'superadmin'
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(location.search).get('dashboardFilter') === 'completed' ? 'Done' : 'To Do')
  const dashboardFilter = new URLSearchParams(location.search).get('dashboardFilter')
  const dashboardFilters = useMemo(() => {
    if (!dashboardFilter) return []
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: workspace.preferences?.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const dateParts = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
    const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`
    if (dashboardFilter === 'due-today') return normalizeWorkOrderFilters([{ field: 'due_date', operator: 'on', values: [today] }])
    if (dashboardFilter === 'overdue') return normalizeWorkOrderFilters([{ field: 'due_date', operator: 'before', values: [today] }])
    if (dashboardFilter === 'high-priority') return normalizeWorkOrderFilters([{ field: 'priority', operator: 'one_of', values: ['Urgent', 'High'] }])
    if (dashboardFilter === 'completed') return normalizeWorkOrderFilters([{ field: 'status', operator: 'one_of', values: ['Completed'] }])
    return []
  }, [dashboardFilter, workspace.preferences?.timezone])
  const [sortId, setSortId] = useState('priority-highest')
  const [unreadFirst, setUnreadFirst] = useState(false)
  const { filters: inboxFilters, setFilters: setInboxFilters } = usePersistedFilterSelection({
    moduleKey: 'work-orders',
    userId,
    organizationId,
    normalizeFilters: normalizeWorkOrderFilters,
  })
  const activeFilters = dashboardFilter ? dashboardFilters : inboxFilters
  const clearDashboardFilter = useCallback(() => {
    if (!dashboardFilter) return
    const nextParams = new URLSearchParams(location.search)
    nextParams.delete('dashboardFilter')
    navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams}` : '' }, { replace: true })
  }, [dashboardFilter, location.pathname, location.search, navigate])
  const [savedWorkOrderFilters, setSavedWorkOrderFilters] = useState([])
  const [savedFiltersLoadedForOrganization, setSavedFiltersLoadedForOrganization] = useState('')
  const [savedFiltersLoadingForOrganization, setSavedFiltersLoadingForOrganization] = useState('')
  const [savedFiltersError, setSavedFiltersError] = useState('')
  const [savedFiltersErrorOrganization, setSavedFiltersErrorOrganization] = useState('')
  const [activeSavedFilterId, setActiveSavedFilterId] = useState(null)
  const [inboxPreferenceError, setInboxPreferenceError] = useState('')
  const [preferencesLoadedForOrganization, setPreferencesLoadedForOrganization] = useState('')
  const [workOrdersById, setWorkOrdersById] = useState({})
  const [recordLookupResult, setRecordLookupResult] = useState(null)
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
  const [isCreating, setIsCreating] = useState(() => canCreateWorkOrders && new URLSearchParams(location.search).get('create') === '1')
  const [copySource, setCopySource] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editingWorkOrderId, setEditingWorkOrderId] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [createError, setCreateError] = useState('')
  const [assigneeOptions, setAssigneeOptions] = useState([])
  const [filterAssigneeOptions, setFilterAssigneeOptions] = useState([])
  const [memberDirectory, setMemberDirectory] = useState([])
  const pendingReadIds = useRef(new Set())
  const savedFilterLoadToken = useRef(0)
  const inboxPreferencesReady = Boolean(organizationId && preferencesLoadedForOrganization === organizationId)
  const isLoading = canViewWorkOrders && (loadState === 'loading' || !inboxPreferencesReady)
  const selectedId = recordId ?? localSelectedId
  const recordLookupKey = recordId && organizationId ? `${organizationId}:${recordId}` : null
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    if (searchParams.get('create') !== '1') return
    searchParams.delete('create')
    navigate({ pathname: location.pathname, search: searchParams.toString() ? `?${searchParams}` : '' }, { replace: true })
  }, [location.pathname, location.search, navigate])
  useEffect(() => {
    savedFilterLoadToken.current += 1
  }, [organizationId])
  useEffect(() => {
    if (!organizationId || !userId) {
      return undefined
    }
    let active = true
    getWorkOrderInboxPreferences({ organizationId })
      .then((preferences) => {
        if (!active) return
        setSortId(preferences.sortId)
        setUnreadFirst(preferences.unreadFirst)
      })
      .catch((preferenceError) => {
        if (active) console.error('Unable to load Work Order Inbox preferences.', preferenceError)
      })
      .finally(() => { if (active) setPreferencesLoadedForOrganization(organizationId) })
    return () => { active = false }
  }, [organizationId, userId])
  const saveInboxPreferences = useCallback(async (nextSortId, nextUnreadFirst) => {
    if (!organizationId || !userId) return
    setInboxPreferenceError('')
    try {
      await saveWorkOrderInboxPreferences({ organizationId, sortId: nextSortId, unreadFirst: nextUnreadFirst })
    } catch (preferenceError) {
      setInboxPreferenceError(preferenceError.message || 'Unable to save Work Order Inbox preferences.')
    }
  }, [organizationId, userId])
  const changeInboxSort = (nextSortId) => {
    setSortId(nextSortId)
    void saveInboxPreferences(nextSortId, unreadFirst)
  }
  const changeUnreadFirst = (nextUnreadFirst) => {
    setUnreadFirst(nextUnreadFirst)
    void saveInboxPreferences(sortId, nextUnreadFirst)
  }
  const changeInboxFilters = (nextFilters) => {
    setInboxFilters(nextFilters)
    setActiveSavedFilterId(null)
    clearDashboardFilter()
  }
  const changeInboxTab = (tab) => {
    setActiveTab(tab)
    clearDashboardFilter()
  }
  const loadSavedWorkOrderFilters = useCallback(async () => {
    if (!organizationId || !canViewWorkOrders || savedFiltersLoadingForOrganization === organizationId) return
    if (savedFiltersLoadedForOrganization === organizationId) return
    const loadToken = ++savedFilterLoadToken.current
    setSavedFiltersLoadingForOrganization(organizationId)
    setSavedFiltersError('')
    setSavedFiltersErrorOrganization(organizationId)
    try {
      const rows = await listWorkOrderSavedFilters({ organizationId, grants })
      if (loadToken !== savedFilterLoadToken.current) return
      setSavedWorkOrderFilters(rows)
      setSavedFiltersLoadedForOrganization(organizationId)
    } catch (loadError) {
      if (loadToken !== savedFilterLoadToken.current) return
      setSavedFiltersError(loadError.message || 'Unable to load saved Work Order filters.')
      setSavedFiltersErrorOrganization(organizationId)
    } finally {
      if (loadToken === savedFilterLoadToken.current) setSavedFiltersLoadingForOrganization('')
    }
  }, [canViewWorkOrders, grants, organizationId, savedFiltersLoadedForOrganization, savedFiltersLoadingForOrganization])
  const createSavedWorkOrderFilter = useCallback(async ({ name, filterScope, filters }) => {
    const savedFilter = await createWorkOrderSavedFilter({
      organizationId,
      filterScope,
      name,
      filters,
      grants,
      canManageOrganizationFilters: canManageOrganizationWorkOrderFilters,
    })
    setSavedWorkOrderFilters((current) => [...current, savedFilter].sort((left, right) => left.filter_scope.localeCompare(right.filter_scope) || left.name.localeCompare(right.name)))
    setActiveSavedFilterId(savedFilter.id)
    return savedFilter
  }, [canManageOrganizationWorkOrderFilters, grants, organizationId])
  const updateSavedWorkOrderFilter = useCallback(async ({ savedFilterId, filterScope, name, filters }) => {
    const savedFilter = await updateWorkOrderSavedFilter({
      organizationId,
      savedFilterId,
      filterScope,
      name,
      filters,
      grants,
      canManageOrganizationFilters: canManageOrganizationWorkOrderFilters,
    })
    setSavedWorkOrderFilters((current) => current.map((item) => item.id === savedFilter.id ? savedFilter : item)
      .sort((left, right) => left.filter_scope.localeCompare(right.filter_scope) || left.name.localeCompare(right.name)))
    return savedFilter
  }, [canManageOrganizationWorkOrderFilters, grants, organizationId])
  const deleteSavedWorkOrderFilter = useCallback(async ({ savedFilterId, filterScope }) => {
    await deleteWorkOrderSavedFilter({
      organizationId,
      savedFilterId,
      filterScope,
      grants,
      canManageOrganizationFilters: canManageOrganizationWorkOrderFilters,
    })
    setSavedWorkOrderFilters((current) => current.filter((item) => item.id !== savedFilterId))
    setActiveSavedFilterId((current) => current === savedFilterId ? null : current)
  }, [canManageOrganizationWorkOrderFilters, grants, organizationId])
  const applySavedWorkOrderFilter = useCallback((savedFilter) => {
    setInboxFilters(savedFilter.filters)
    setActiveSavedFilterId(savedFilter.id)
    clearDashboardFilter()
  }, [clearDashboardFilter, setInboxFilters])
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(timeout)
  }, [search])
  useEffect(() => {
    if (!canViewWorkOrders || !organizationId) {
      return undefined
    }
    let active = true
    listWorkOrderInboxCounts({ organizationId, tab: activeTab, search: debouncedSearch, filters: activeFilters, grants })
      .then((counts) => { if (active) setGroupCounts(counts) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load Work Orders.') })
      .finally(() => { if (active) setLoadState('ready') })
    return () => { active = false }
  }, [activeFilters, activeTab, canViewWorkOrders, debouncedSearch, grants, organizationId, refreshVersion])
  const selected = workOrdersById[selectedId]
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
      await markWorkOrderInboxRead({ organizationId, tab: activeTab, search: debouncedSearch, filters: activeFilters, grants })
      const normalizedSearch = debouncedSearch.trim().toLowerCase()
      setWorkOrdersById((current) => Object.fromEntries(Object.entries(current).map(([id, order]) => {
        const inTab = activeTab === 'Done' ? order.status === 'Completed' : order.status !== 'Completed'
        const matchesSearch = !normalizedSearch || `${order.title} ${order.id} ${order.work_order_number}`.toLowerCase().includes(normalizedSearch)
        return [id, inTab && matchesSearch && matchesWorkOrderFilters(order, activeFilters) ? { ...order, is_read: true } : order]
      })))
      const tabLabel = activeTab === 'Done' ? 'Done' : 'To Do'
      const matchingLabel = debouncedSearch.trim() || activeFilters.length ? 'matching ' : ''
      setReadToast(`All ${matchingLabel}${tabLabel} Work Orders have been marked as read.`)
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
    if (!recordId || !canViewWorkOrders || !organizationId || workOrdersById[recordId] || recordLookupResult?.key === recordLookupKey) return undefined
    let active = true
    getWorkOrderById({ organizationId, workOrderId: recordId, grants })
      .then((order) => {
        if (!active) return
        if (!order) {
          setRecordLookupResult({ key: recordLookupKey, status: 'not-found' })
          return
        }
        const normalized = normalizeWorkOrder(order, workspace.preferences)
        setWorkOrdersById((current) => ({ ...current, [order.id]: normalized }))
        setRecordLookupResult({ key: recordLookupKey, status: 'found' })
        void markViewed(normalized)
      })
      .catch((loadError) => {
        if (!active) return
        setRecordLookupResult({ key: recordLookupKey, status: 'error' })
        setError(loadError.message || 'Unable to load this Work Order.')
      })
    return () => { active = false }
  }, [canViewWorkOrders, grants, markViewed, organizationId, recordId, recordLookupKey, recordLookupResult?.key, workOrdersById, workspace.preferences])
  const loadGroupPage = async ({ tab, group, sort, unreadFirst, offset, filters }) => {
    const orders = await listWorkOrderInboxPage({ organizationId, tab, group, search: debouncedSearch, sort, unreadFirst, offset, filters, grants })
    return orders.map((order) => normalizeWorkOrder(order, workspace.preferences))
  }
  const loadWorkOrderActivity = useCallback((order, before) => listWorkOrderActivity({
    organizationId,
    workOrderId: order.id,
    grants,
    record: workOrderAccessContext(order, userId, teamIds),
    before,
  }), [grants, organizationId, teamIds, userId])
  const postWorkOrderComment = useCallback((order, body, files) => createWorkOrderComment({
    organizationId,
    workOrderId: order.id,
    body,
    files,
    grants,
    record: workOrderAccessContext(order, userId, teamIds),
  }), [grants, organizationId, teamIds, userId])
  const editWorkOrderComment = useCallback((order, comment, body) => updateWorkOrderComment({
    organizationId,
    workOrderId: order.id,
    commentId: comment.id,
    authorId: comment.author_id,
    body,
    grants,
    record: workOrderAccessContext(order, userId, teamIds),
  }), [grants, organizationId, teamIds, userId])
  const removeWorkOrderComment = useCallback((order, comment) => deleteWorkOrderComment({
    organizationId,
    workOrderId: order.id,
    commentId: comment.id,
    authorId: comment.author_id,
    grants,
    record: workOrderAccessContext(order, userId, teamIds),
    canDeleteAny: canDeleteAnyWorkOrderComment,
  }), [canDeleteAnyWorkOrderComment, grants, organizationId, teamIds, userId])
  const resolveWorkOrderLinks = useCallback((workOrderIds) => getWorkOrderLinkPreviews({
    organizationId,
    workOrderIds,
    grants,
  }), [grants, organizationId])
  const hydrateGroupAttachments = (orders) => signWorkOrderAttachmentUrls(orders)
  const prepareWorkOrderForPdfExport = async (order) => {
    const [signedOrder] = await signWorkOrderAttachmentUrls([order])
    return signedOrder ?? order
  }
  const storeOrders = (orders, { selectFirst = false } = {}) => {
    setWorkOrdersById((current) => ({
      ...current,
      ...Object.fromEntries(orders.map((order) => {
        const existingOrder = current[order.id]
        const existingAttachments = existingOrder?.work_order_attachments ?? []
        const attachments = (order.work_order_attachments ?? []).map((attachment) => ({
          ...attachment,
          signed_url: attachment.signed_url ?? existingAttachments.find((existing) => existing.id === attachment.id)?.signed_url ?? null,
        }))
        return [order.id, { ...order, is_read: existingOrder?.is_read ?? order.is_read, work_order_attachments: attachments }]
      })),
    }))
    if (selectFirst && !recordId && !localSelectedId && orders[0]) {
      setLocalSelectedId(orders[0].id)
      void markViewed(orders[0])
    }
  }
  const selectOrder = (order) => {
    guardNavigation(() => {
      setIsCreating(false)
      setCopySource(null)
      setEditingWorkOrderId(null)
      setHasUnsavedChanges(false)
      setLocalSelectedId(order.id)
      onNavigateRecord?.('workorders', order.id)
      void markViewed(order)
    })
  }
  useEffect(() => {
    if (!organizationId) return undefined
    let active = true
    Promise.all([
      listOrganizationMembers(organizationId),
      listOrganizationTeams(organizationId),
      canAssignWorkOrders ? listOrganizationTeamMemberships(organizationId) : Promise.resolve([]),
    ])
      .then(([members, teams, teamMemberships]) => {
        if (!active) return
        const membersWithAccounts = members.filter((member) => member.user_id)
        setMemberDirectory(members
          .filter((member) => member.user_id)
          .map((member) => ({
            id: member.user_id,
            name: memberName(member),
            avatarUrl: member.profile?.avatar_url?.startsWith('http') ? member.profile.avatar_url : '',
            firstName: member.profile?.first_name,
            lastName: member.profile?.last_name,
          })))
        setFilterAssigneeOptions(
          membersWithAccounts
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
            .concat(teams.map((team) => ({ value: `team:${team.id}`, label: team.name, icon: UsersRound }))),
        )
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
        if (active) {
          setAssigneeOptions([])
          setFilterAssigneeOptions([])
          setMemberDirectory([])
        }
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
      setCopySource(null)
      setLocalSelectedId(created.id)
      void markViewed(created)
      setRefreshVersion((version) => version + 1)
    } catch (createLoadError) {
      setCreateError(createLoadError.message || 'Unable to create this Work Order.')
    } finally {
      setIsSaving(false)
    }
  }
  const handleEdit = (order) => {
    setEditError('')
    setEditingWorkOrderId(order.id)
  }
  const handleCopy = (order) => {
    if (!canCreateWorkOrders) return
    const assignmentRows = order.work_order_assignments?.length
      ? order.work_order_assignments
      : [
        ...(order.assigned_to ? [{ user_id: order.assigned_to }] : []),
        ...(order.team_id ? [{ team_id: order.team_id }] : []),
      ]
    const availableAssignmentValues = new Set(assigneeOptions.map((option) => option.value))
    const assignments = canAssignWorkOrders
      ? assignmentRows.filter((assignment) => {
        const value = assignment.user_id ? `user:${assignment.user_id}` : assignment.team_id ? `team:${assignment.team_id}` : ''
        return value && availableAssignmentValues.has(value)
      })
      : []
    setCopySource({
      ...order,
      assigned_to: assignments.find((assignment) => assignment.user_id)?.user_id ?? null,
      team_id: assignments.find((assignment) => assignment.team_id)?.team_id ?? null,
      work_order_assignments: assignments,
      work_order_attachments: [],
    })
    setCreateError('')
    setEditingWorkOrderId(null)
    setIsCreating(true)
  }
  const handleUpdate = async (values) => {
    if (!organizationId || !selected) return
    const currentAssignments = selected.work_order_assignments?.length
      ? selected.work_order_assignments.map((assignment) => ({ userId: assignment.user_id, teamId: assignment.team_id }))
      : [
        ...(selected.assigned_to ? [{ userId: selected.assigned_to }] : []),
        ...(selected.team_id ? [{ teamId: selected.team_id }] : []),
      ]
    const assignmentsChanged = JSON.stringify(assignmentKeys(values.assignments)) !== JSON.stringify(assignmentKeys(currentAssignments))
    setIsSavingEdit(true)
    setEditError('')
    try {
      const updated = normalizeWorkOrder(await updateWorkOrderDetails({
        organizationId,
        workOrderId: selected.id,
        ...values,
        assignments: canAssignWorkOrders && assignmentsChanged ? values.assignments : null,
        grants,
        record: {
          userId,
          ownerId: selected.created_by,
          assigneeId: selected.assigned_to,
          assigneeIds: selected.work_order_assignments?.map((assignment) => assignment.user_id).filter(Boolean),
          teamId: selected.team_id,
          assignedTeamIds: selected.work_order_assignments?.map((assignment) => assignment.team_id).filter(Boolean),
          teamIds,
        },
      }), workspace.preferences)
      setWorkOrdersById((current) => ({ ...current, [updated.id]: updated }))
      setHasUnsavedChanges(false)
      setEditingWorkOrderId(null)
      setRefreshVersion((version) => version + 1)
    } catch (updateError) {
      setEditError(updateError.message || 'Unable to save Work Order changes.')
    } finally {
      setIsSavingEdit(false)
    }
  }
  const isEditingSelected = Boolean(selected && editingWorkOrderId === selected.id)
  const isMobileRecordView = Boolean(recordId || isCreating || isEditingSelected)
  const recordLookupFinished = recordLookupResult?.key === recordLookupKey
  const isLoadingSelectedRecord = Boolean(recordId && !selected && !recordLookupFinished)
  const missingRecord = Boolean(recordId && !selected && recordLookupFinished && recordLookupResult.status === 'not-found')

  return <>
  <PanelLayout title="Work orders" modeIcon={PanelLeft} searchValue={search} onSearch={setSearch} searchPlaceholder="Search Work Orders" actionLabel="New work order" onAction={() => guardNavigation(() => { setEditingWorkOrderId(null); setCopySource(null); setCreateError(''); setIsCreating(true) })} showHeaderSearch={canViewWorkOrders} showAction={canCreateWorkOrders} className={`work-orders-page${isMobileRecordView ? ' is-mobile-record-view' : ''}`} bodyClassName="work-orders-layout" subnavigation={canViewWorkOrders ? <WorkOrderFilters
    filters={activeFilters}
    onFiltersChange={changeInboxFilters}
    assigneeOptions={filterAssigneeOptions}
    savedFilters={savedFiltersLoadedForOrganization === organizationId ? savedWorkOrderFilters : []}
    savedFiltersLoading={savedFiltersLoadingForOrganization === organizationId}
    savedFiltersError={savedFiltersErrorOrganization === organizationId ? savedFiltersError : ''}
    savedFiltersLoaded={savedFiltersLoadedForOrganization === organizationId}
    canSavePersonalFilters={canSavePersonalWorkOrderFilters}
    canManageOrganizationFilters={canSavePersonalWorkOrderFilters && canManageOrganizationWorkOrderFilters}
    userId={userId}
    activeSavedFilterId={activeSavedFilterId}
    onLoadSavedFilters={loadSavedWorkOrderFilters}
    onApplySavedFilter={applySavedWorkOrderFilter}
    onCreateSavedFilter={createSavedWorkOrderFilter}
    onUpdateSavedFilter={updateSavedWorkOrderFilter}
    onDeleteSavedFilter={deleteSavedWorkOrderFilter}
  /> : null}>
    {isLoading && <div className="work-orders-loading">Loading Work Orders...</div>}
    {!isLoading && error && <div className="work-orders-loading" role="alert">{error}</div>}
    {!isLoading && !error && !canViewWorkOrders && <div className="work-orders-loading" role="status">You do not have permission to view Work Orders.</div>}
    {!isLoading && !error && canViewWorkOrders && <>{readError && <div className="work-orders-loading" role="alert">{readError}</div>}{inboxPreferenceError && <div className="work-orders-loading" role="alert">{inboxPreferenceError}</div>}<WorkOrderList userId={userId} organizationId={organizationId} activeTab={activeTab} setActiveTab={changeInboxTab} search={debouncedSearch} filters={activeFilters} groupCounts={groupCounts} readStatusById={workOrdersById} selected={selected} onOrdersLoaded={storeOrders} onLoadGroupPage={loadGroupPage} onHydrateAttachments={hydrateGroupAttachments} refreshVersion={refreshVersion} onSelect={selectOrder} onStatusChange={changeStatus} onReadAll={() => { setReadError(''); setIsReadAllConfirmOpen(true) }} isReadAllSaving={isSavingReadState || search !== debouncedSearch} canChangeStatusForOrder={canChangeStatusForOrder} sortId={sortId} onSortChange={changeInboxSort} unreadFirst={unreadFirst} onUnreadFirstChange={changeUnreadFirst} />{isCreating ? <NewWorkOrderForm initialWorkOrder={copySource} onCancel={() => { setIsCreating(false); setCopySource(null) }} onCreate={handleCreate} isSaving={isSaving} error={createError} assigneeOptions={assigneeOptions} canAssign={canAssignWorkOrders} dateFormat={workspace.preferences?.date_format} /> : isEditingSelected ? <NewWorkOrderForm mode="edit" initialWorkOrder={selected} onCancel={() => guardNavigation(() => { setHasUnsavedChanges(false); setEditingWorkOrderId(null) })} onDirtyChange={setHasUnsavedChanges} onUpdate={handleUpdate} isSaving={isSavingEdit} error={editError} assigneeOptions={assigneeOptions} canAssign={canAssignWorkOrders} dateFormat={workspace.preferences?.date_format} /> : <WorkOrderDetail selected={selected} isLoadingRecord={isLoadingSelectedRecord} missingRecord={missingRecord} onBack={() => { setLocalSelectedId(undefined); onNavigate?.('Work Orders') }} onEdit={() => selected && handleEdit(selected)} onCopy={() => selected && handleCopy(selected)} onStatusChange={changeStatus} onPreparePdfExport={prepareWorkOrderForPdfExport} assigneeOptions={assigneeOptions} memberDirectory={memberDirectory} onToggleRead={toggleReadState} isSavingReadState={isSavingReadState} grants={grants} userId={userId} teamIds={teamIds} dateFormat={workspace.preferences?.date_format} timezone={workspace.preferences?.timezone} onLoadActivity={loadWorkOrderActivity} onPostComment={postWorkOrderComment} onUpdateComment={editWorkOrderComment} onDeleteComment={removeWorkOrderComment} canDeleteAnyComments={canDeleteAnyWorkOrderComment} onResolveWorkOrderLinks={resolveWorkOrderLinks} />}</>}
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
