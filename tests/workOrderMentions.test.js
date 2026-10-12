import { describe, expect, it } from 'vitest'
import {
  buildWorkOrderMentionTargets,
  getWorkOrderMentionSuggestions,
  resolveWorkOrderMentionTargets,
} from '../src/utils/workOrderMentions'

const members = [
  { user_id: 'user-1', status: 'active', profile: { first_name: 'Alex', last_name: 'Rivera', user_number: 12 } },
  { user_id: 'user-2', status: 'invited', profile: { first_name: 'Pending', last_name: 'Member' } },
]

describe('work order mentions', () => {
  it('builds active user and team mention targets', () => {
    const targets = buildWorkOrderMentionTargets(members, [{ id: 'team-1', name: 'Maintenance Team' }])

    expect(targets.map((target) => `${target.type}:${target.id}`)).toEqual(['user:user-1', 'team:team-1'])
    expect(targets[0].aliases).toContain('alex')
    expect(targets[1].mention).toBe('maintenanceteam')
  })

  it('resolves user and team tokens and ignores ambiguous aliases', () => {
    const targets = buildWorkOrderMentionTargets(members, [{ id: 'team-1', name: 'Maintenance Team' }])

    expect(resolveWorkOrderMentionTargets('Please ask @alex and @maintenanceteam', targets)).toEqual({
      mentionedUserIds: ['user-1'],
      mentionedTeamIds: ['team-1'],
    })

    const ambiguousTargets = buildWorkOrderMentionTargets([
      ...members,
      { user_id: 'user-3', status: 'active', profile: { first_name: 'Alex', last_name: 'Stone' } },
    ])
    expect(resolveWorkOrderMentionTargets('@alex', ambiguousTargets)).toEqual({ mentionedUserIds: [], mentionedTeamIds: [] })
  })

  it('filters suggestions from the active token', () => {
    const targets = buildWorkOrderMentionTargets(members, [{ id: 'team-1', name: 'Maintenance Team' }])
    const result = getWorkOrderMentionSuggestions('Please @maint', 13, targets)

    expect(result.suggestions.map((target) => target.id)).toEqual(['team-1'])
  })
})
