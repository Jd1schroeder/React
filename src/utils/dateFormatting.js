export function formatDateForUser(value, dateFormat = 'MM/DD/YYYY', timeZone) {
  if (!value) return 'Not available'

  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  if (dateFormat === 'DD/MM/YYYY') return `${values.day}/${values.month}/${values.year}`
  if (dateFormat === 'YYYY-MM-DD') return `${values.year}-${values.month}-${values.day}`
  return `${values.month}/${values.day}/${values.year}`
}

function getCalendarParts(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
}

export function formatLastVisitForUser(value, { dateFormat = 'MM/DD/YYYY', timeZone, weekStart = 'Sunday' } = {}) {
  if (!value) return 'Not available'
  const visitParts = getCalendarParts(value, timeZone)
  const todayParts = getCalendarParts(new Date(), timeZone)
  const visitDay = Date.UTC(Number(visitParts.year), Number(visitParts.month) - 1, Number(visitParts.day))
  const todayDay = Date.UTC(Number(todayParts.year), Number(todayParts.month) - 1, Number(todayParts.day))
  const daysSinceVisit = Math.round((todayDay - visitDay) / 86400000)
  if (daysSinceVisit === 0) return 'Today'
  if (daysSinceVisit === 1) return 'Yesterday'

  const weekdayIndexes = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }
  const weekStartIndex = weekdayIndexes[weekStart] ?? 0
  const daysSinceWeekStart = (weekdayIndexes[todayParts.weekday] - weekStartIndex + 7) % 7
  const weekStartDay = todayDay - (daysSinceWeekStart * 86400000)
  if (visitDay >= weekStartDay && visitDay < todayDay) return visitParts.weekday
  return formatDateForUser(value, dateFormat, timeZone)
}
