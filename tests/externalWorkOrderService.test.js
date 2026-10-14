import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/supabase', () => ({ supabase: { rpc } }))

import {
  createExternalWorkOrderShare,
  getExternalWorkOrder,
  listExternalWorkOrderShareContacts,
  markExternalWorkOrderFinished,
  postExternalWorkOrderComment,
  setExternalWorkOrderShareContacts,
} from '../src/services/externalWorkOrderService'

beforeEach(() => {
  rpc.mockReset()
  rpc.mockResolvedValue({ data: { available: true }, error: null })
})

describe('external Work Order service contract', () => {
  it('uses the authenticated share RPC with the Work Order id', async () => {
    rpc.mockResolvedValueOnce({ data: { enabled: true, token: 'token' }, error: null })

    await expect(createExternalWorkOrderShare('wo-1')).resolves.toEqual({ enabled: true, token: 'token' })
    expect(rpc).toHaveBeenCalledWith('create_work_order_external_share', { target_work_order_id: 'wo-1' })
  })

  it('uses the public read RPC without exposing table access in the client', async () => {
    await expect(getExternalWorkOrder('a'.repeat(64))).resolves.toEqual({ available: true })
    expect(rpc).toHaveBeenCalledWith('get_external_work_order', { raw_token: 'a'.repeat(64) })
  })

  it('passes external comment and completion identity to narrow RPCs', async () => {
    await postExternalWorkOrderComment({ token: 'token', name: 'Vendor Contact', email: 'vendor@example.com', body: 'Finished.' })
    await markExternalWorkOrderFinished({ token: 'token', name: 'Vendor Contact' })

    expect(rpc).toHaveBeenNthCalledWith(1, 'post_external_work_order_comment', {
      raw_token: 'token',
      external_name: 'Vendor Contact',
      external_email: 'vendor@example.com',
      comment_body: 'Finished.',
    })
    expect(rpc).toHaveBeenNthCalledWith(2, 'mark_external_work_order_finished', {
      raw_token: 'token',
      external_name: 'Vendor Contact',
    })
  })

  it('keeps vendor contact selection behind authenticated RPCs', async () => {
    const contacts = [{ displayName: 'Vendor Contact', vendorName: 'Acme Services', email: 'vendor@example.com' }]

    await expect(listExternalWorkOrderShareContacts('wo-1')).resolves.toEqual({ available: true })
    await expect(setExternalWorkOrderShareContacts('wo-1', contacts)).resolves.toEqual({ available: true })

    expect(rpc).toHaveBeenNthCalledWith(1, 'list_work_order_external_share_contacts', { target_work_order_id: 'wo-1' })
    expect(rpc).toHaveBeenNthCalledWith(2, 'set_work_order_external_share_contacts', { target_work_order_id: 'wo-1', target_contacts: contacts })
  })

  it('propagates Supabase errors to the caller', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('permission denied') })

    await expect(getExternalWorkOrder('token')).rejects.toThrow('permission denied')
  })

  it('does not expose database implementation errors to external users', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: Object.assign(new Error('function digest(text, unknown) does not exist'), { code: '42883' }) })

    await expect(getExternalWorkOrder('token')).rejects.toThrow('This shared Work Order is temporarily unavailable. Please try again later.')
  })
})
