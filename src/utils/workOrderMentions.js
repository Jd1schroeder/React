function normalizeMentionValue(value) {
  return String(value ?? '').toLocaleLowerCase().replace(/[^a-z0-9]/gu, '')
}

function mentionAlias(value) {
  const normalized = normalizeMentionValue(value)
  return normalized ? normalized : null
}

export function buildWorkOrderMentionTargets(members = [], teams = []) {
  const userTargets = members
    .filter((member) => member?.user_id && member.status === 'active')
    .map((member) => {
      const firstName = member.profile?.first_name ?? ''
      const lastName = member.profile?.last_name ?? ''
      const name = [firstName, lastName].filter(Boolean).join(' ') || member.email || member.contact_value || 'Unnamed user'
      const localEmail = member.email?.split('@')[0]
      const aliases = [
        firstName,
        lastName,
        `${firstName}${lastName}`,
        `${firstName}.${lastName}`,
        localEmail,
        member.profile?.user_number,
      ].map(mentionAlias).filter(Boolean)
      const mention = mentionAlias(firstName) || mentionAlias(localEmail) || mentionAlias(name) || member.user_id
      const fallbackMention = mentionAlias(`${firstName}.${lastName}`) || mentionAlias(localEmail) || mentionAlias(member.profile?.user_number) || mention
      return { type: 'user', id: member.user_id, label: name, mention, fallbackMention, aliases: [...new Set([...aliases, mention])] }
    })
  const teamTargets = teams
    .filter((team) => team?.id && team.name)
    .map((team) => {
      const mention = mentionAlias(team.name) || team.id
      return { type: 'team', id: team.id, label: team.name, mention, aliases: [...new Set([mention, mentionAlias(team.name)])].filter(Boolean) }
    })
  const targets = [...userTargets, ...teamTargets]
  const mentionCounts = new Map()
  for (const target of targets) mentionCounts.set(target.mention, (mentionCounts.get(target.mention) ?? 0) + 1)
  return targets.map((target) => {
    const mention = mentionCounts.get(target.mention) > 1 ? target.fallbackMention ?? target.mention : target.mention
    return { ...target, mention, aliases: [...new Set([...(target.aliases ?? []), mention])] }
  })
}

export function getActiveWorkOrderMention(value, cursorPosition = value.length) {
  const beforeCursor = String(value ?? '').slice(0, cursorPosition)
  const match = beforeCursor.match(/(?:^|\s)@([a-z0-9._-]*)$/iu)
  if (!match) return null
  return {
    query: match[1],
    start: beforeCursor.length - match[1].length - 1,
    end: cursorPosition,
  }
}

export function getWorkOrderMentionSuggestions(value, cursorPosition, targets = []) {
  const activeMention = getActiveWorkOrderMention(value, cursorPosition)
  if (!activeMention) return { activeMention: null, suggestions: [] }
  const normalizedQuery = normalizeMentionValue(activeMention.query)
  const suggestions = targets
    .filter((target) => !normalizedQuery || target.aliases.some((alias) => alias.startsWith(normalizedQuery)))
    .sort((left, right) => left.type.localeCompare(right.type) || left.label.localeCompare(right.label))
    .slice(0, 8)
  return { activeMention, suggestions }
}

export function resolveWorkOrderMentionTargets(value, targets = []) {
  const targetByAlias = new Map()
  for (const target of targets) {
    for (const alias of target.aliases ?? []) {
      const key = normalizeMentionValue(alias)
      if (!key) continue
      if (!targetByAlias.has(key)) {
        targetByAlias.set(key, target)
      } else if (targetByAlias.get(key) !== target) {
        targetByAlias.set(key, null)
      }
    }
  }
  const resolved = new Map()
  const mentionPattern = /(?:^|\s)@([a-z0-9][a-z0-9._-]*)/giu
  for (const match of String(value ?? '').matchAll(mentionPattern)) {
    const target = targetByAlias.get(normalizeMentionValue(match[1]))
    if (target) resolved.set(`${target.type}:${target.id}`, target)
  }
  return {
    mentionedUserIds: [...resolved.values()].filter((target) => target.type === 'user').map((target) => target.id),
    mentionedTeamIds: [...resolved.values()].filter((target) => target.type === 'team').map((target) => target.id),
  }
}
