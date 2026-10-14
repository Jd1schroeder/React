import { supabase } from '../lib/supabase'

function normalizeExternalWorkOrderError(error, fallback) {
  const message = String(error?.message ?? '')
  const isImplementationError = ['42883', '42703', '42P01', 'PGRST202', 'PGRST205'].includes(error?.code)
    || /function .* does not exist|record .* has no field|relation .* does not exist/i.test(message)
  return isImplementationError ? new Error(fallback) : error
}

async function callExternalRpc(name, args, fallback) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw normalizeExternalWorkOrderError(error, fallback)
  return data
}

export async function createExternalWorkOrderShare(workOrderId) {
  return callExternalRpc('create_work_order_external_share', { target_work_order_id: workOrderId }, 'External sharing is temporarily unavailable. Please try again later.')
}

export async function getExternalWorkOrderShare(workOrderId) {
  return callExternalRpc('get_work_order_external_share', { target_work_order_id: workOrderId }, 'External sharing is temporarily unavailable. Please try again later.')
}

export async function disableExternalWorkOrderShare(workOrderId) {
  return callExternalRpc('disable_work_order_external_share', { target_work_order_id: workOrderId }, 'External sharing is temporarily unavailable. Please try again later.')
}

export async function resetExternalWorkOrderShare(workOrderId) {
  return callExternalRpc('reset_work_order_external_share', { target_work_order_id: workOrderId }, 'External sharing is temporarily unavailable. Please try again later.')
}

export async function listExternalWorkOrderShareContacts(workOrderId) {
  return (await callExternalRpc('list_work_order_external_share_contacts', { target_work_order_id: workOrderId }, 'Vendor contacts are temporarily unavailable. Please try again later.')) ?? []
}

export async function setExternalWorkOrderShareContacts(workOrderId, contacts) {
  return (await callExternalRpc('set_work_order_external_share_contacts', { target_work_order_id: workOrderId, target_contacts: contacts }, 'Vendor contacts are temporarily unavailable. Please try again later.')) ?? []
}

export async function getExternalWorkOrder(token) {
  return callExternalRpc('get_external_work_order', { raw_token: token }, 'This shared Work Order is temporarily unavailable. Please try again later.')
}

export async function postExternalWorkOrderComment({ token, name, email, body }) {
  return callExternalRpc('post_external_work_order_comment', {
    raw_token: token,
    external_name: name,
    external_email: email || null,
    comment_body: body,
  }, 'Comments are temporarily unavailable. Please try again later.')
}

export async function markExternalWorkOrderFinished({ token, name }) {
  return callExternalRpc('mark_external_work_order_finished', {
    raw_token: token,
    external_name: name,
  }, 'Completion is temporarily unavailable. Please try again later.')
}

