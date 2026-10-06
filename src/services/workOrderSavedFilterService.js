import { supabase } from '../lib/supabase'
import { assertPermission } from './authorizationService'
import { normalizeWorkOrderFilters } from '../utils/workOrderFilters'

const savedFilterColumns = 'id, organization_id, created_by, filter_scope, name, filters, created_at, updated_at'

function validateSavedFilter({ name, filters, grants }) {
  assertPermission(grants, 'work_orders.manage_saved_filters')
  const normalizedName = typeof name === 'string' ? name.trim() : ''
  if (!normalizedName || normalizedName.length > 80) throw new Error('Enter a filter name between 1 and 80 characters.')
  const normalizedFilters = normalizeWorkOrderFilters(filters)
  if (!normalizedFilters.length) throw new Error('Add at least one valid filter before saving.')
  return { name: normalizedName, filters: normalizedFilters }
}

function throwIfError(error) {
  if (!error) return
  if (error.code === '23505') throw new Error('A saved filter with this name already exists in this collection.')
  throw error
}

export async function listWorkOrderSavedFilters({ organizationId, grants }) {
  assertPermission(grants, 'work_orders.view')
  const { data, error } = await supabase
    .from('work_order_saved_filters')
    .select(savedFilterColumns)
    .eq('organization_id', organizationId)
    .order('filter_scope', { ascending: true })
    .order('name', { ascending: true })
  throwIfError(error)
  return data ?? []
}

export async function createWorkOrderSavedFilter({ organizationId, filterScope = 'personal', name, filters, grants, canManageOrganizationFilters = false }) {
  const normalized = validateSavedFilter({ name, filters, grants })
  if (!['personal', 'organization'].includes(filterScope)) throw new Error('Invalid saved filter collection.')
  if (filterScope === 'organization' && !canManageOrganizationFilters) throw new Error('Only organization administrators can save shared filters.')
  const { data, error } = await supabase
    .from('work_order_saved_filters')
    .insert({ organization_id: organizationId, filter_scope: filterScope, ...normalized })
    .select(savedFilterColumns)
    .single()
  throwIfError(error)
  return data
}

export async function updateWorkOrderSavedFilter({ organizationId, savedFilterId, filterScope, name, filters, grants, canManageOrganizationFilters = false }) {
  const normalized = validateSavedFilter({ name, filters, grants })
  if (filterScope === 'organization' && !canManageOrganizationFilters) throw new Error('Only organization administrators can edit shared filters.')
  const { data, error } = await supabase
    .from('work_order_saved_filters')
    .update(normalized)
    .eq('organization_id', organizationId)
    .eq('id', savedFilterId)
    .select(savedFilterColumns)
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('This saved filter is unavailable or you do not have permission to edit it.')
  return data
}

export async function deleteWorkOrderSavedFilter({ organizationId, savedFilterId, filterScope, grants, canManageOrganizationFilters = false }) {
  assertPermission(grants, 'work_orders.manage_saved_filters')
  if (filterScope === 'organization' && !canManageOrganizationFilters) throw new Error('Only organization administrators can delete shared filters.')
  const { data, error } = await supabase
    .from('work_order_saved_filters')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', savedFilterId)
    .select('id')
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('This saved filter is unavailable or you do not have permission to delete it.')
  return data.id
}
