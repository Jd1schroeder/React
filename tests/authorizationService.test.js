import { describe, expect, it } from 'vitest'
import { assertPermission, canAccessRecord, hasPermission, permissionMap } from '../src/services/authorizationService'

describe('authorizationService', () => {
  const userId = 'user-a'

  it('normalizes persisted permission rows and detects grants', () => {
    const grants = permissionMap([{ permission_key: 'work_orders.view', scope: 'assigned' }])
    expect(grants).toEqual({ 'work_orders.view': 'assigned' })
    expect(hasPermission(grants, 'work_orders.view')).toBe(true)
    expect(hasPermission(grants, 'work_orders.delete')).toBe(false)
  })

  it('evaluates own and assigned record scopes', () => {
    expect(canAccessRecord({ 'work_orders.edit': 'own' }, 'work_orders.edit', { userId, ownerId: userId })).toBe(true)
    expect(canAccessRecord({ 'work_orders.edit': 'own' }, 'work_orders.edit', { userId, ownerId: 'user-b' })).toBe(false)
    expect(canAccessRecord({ 'work_orders.change_status': 'assigned' }, 'work_orders.change_status', { userId, assigneeId: userId })).toBe(true)
    expect(canAccessRecord({ 'work_orders.change_status': 'assigned' }, 'work_orders.change_status', { userId, assigneeId: 'user-b' })).toBe(false)
  })

  it('requires an explicit team match for team scope and lets any access records', () => {
    expect(canAccessRecord({ 'work_orders.view': 'team' }, 'work_orders.view', { userId, isTeamRecord: false })).toBe(false)
    expect(canAccessRecord({ 'work_orders.view': 'team' }, 'work_orders.view', { userId, isTeamRecord: true })).toBe(true)
    expect(canAccessRecord({ 'work_orders.view': 'team' }, 'work_orders.view', { userId, teamId: 'team-a', teamIds: ['team-a'] })).toBe(true)
    expect(canAccessRecord({ 'work_orders.view': 'team' }, 'work_orders.view', { userId, teamId: 'team-b', teamIds: ['team-a'] })).toBe(false)
    expect(canAccessRecord({ 'work_orders.view': 'any' }, 'work_orders.view', { userId })).toBe(true)
  })

  it('resolves assignment scopes across multiple direct users and teams', () => {
    expect(canAccessRecord({ 'work_orders.change_status': 'assigned' }, 'work_orders.change_status', {
      userId,
      assigneeIds: ['user-b', userId],
    })).toBe(true)
    expect(canAccessRecord({ 'work_orders.change_status': 'assigned' }, 'work_orders.change_status', {
      userId: 'user-c',
      assigneeIds: ['user-a', 'user-b'],
    })).toBe(false)
    expect(canAccessRecord({ 'work_orders.view': 'team' }, 'work_orders.view', {
      userId,
      assignedTeamIds: ['team-a', 'team-b'],
      teamIds: ['team-b'],
    })).toBe(true)
    expect(canAccessRecord({ 'work_orders.view': 'team' }, 'work_orders.view', {
      userId,
      assignedTeamIds: ['team-a'],
      teamIds: ['team-b'],
    })).toBe(false)
  })

  it('fails closed for missing or invalid grants', () => {
    expect(hasPermission({}, 'work_orders.view')).toBe(false)
    expect(canAccessRecord({}, 'work_orders.view', { userId, ownerId: userId })).toBe(false)
    expect(canAccessRecord({ 'work_orders.view': 'invalid' }, 'work_orders.view', { userId })).toBe(false)
  })

  it('asserts permission and rejects unauthorized actions', () => {
    expect(assertPermission({ 'work_orders.create': 'own' }, 'work_orders.create')).toBe(true)
    expect(() => assertPermission({}, 'work_orders.create')).toThrow('work_orders.create')
    expect(() => assertPermission({ 'work_orders.edit': 'own' }, 'work_orders.edit', { userId, ownerId: 'user-b' })).toThrow('work_orders.edit')
  })
})
