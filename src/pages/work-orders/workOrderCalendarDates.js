const DAY_MS = 24 * 60 * 60 * 1000

export function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function dateKey(date) {
  return date.toISOString().slice(0, 10)
}

export function addCalendarDays(key, amount) {
  return dateKey(new Date(dateFromKey(key).getTime() + amount * DAY_MS))
}

export function startOfCalendarWeek(key) {
  return addCalendarDays(key, -dateFromKey(key).getUTCDay())
}

export function startOfCalendarMonth(key) {
  const date = dateFromKey(key)
  return dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)))
}

export function shiftCalendarMonth(key, amount) {
  const date = dateFromKey(key)
  const firstOfTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1))
  const lastDay = new Date(Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth() + 1, 0)).getUTCDate()
  return dateKey(new Date(Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth(), Math.min(date.getUTCDate(), lastDay))))
}

export function calendarLabelDate(key, options) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(dateFromKey(key))
}

export function getWorkOrderCalendarRange(view, selectedDate) {
  const firstVisibleDate = view === 'week' ? startOfCalendarWeek(selectedDate) : startOfCalendarWeek(startOfCalendarMonth(selectedDate))
  const monthStart = startOfCalendarMonth(selectedDate)
  const monthDate = dateFromKey(monthStart)
  const monthDays = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate()
  const monthGridDays = Math.ceil((monthDate.getUTCDay() + monthDays) / 7) * 7
  const lastVisibleDate = view === 'week'
    ? addCalendarDays(firstVisibleDate, 6)
    : addCalendarDays(firstVisibleDate, monthGridDays - 1)
  return { startDate: firstVisibleDate, endDate: lastVisibleDate }
}

export function buildWorkOrderCalendarMarkers(records, todayDate) {
  return records.reduce((result, record) => {
    if (!record.due_date) return result
    const marker = result[record.due_date] ?? { open: 0, completed: 0, late: 0 }
    if (record.status === 'Completed') marker.completed += 1
    else if (todayDate && record.due_date < todayDate) marker.late += 1
    else marker.open += 1
    result[record.due_date] = marker
    return result
  }, {})
}
