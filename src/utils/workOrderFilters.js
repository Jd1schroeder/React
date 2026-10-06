const filterRules = {
  assigned_to: {
    operators: ['one_of', 'none_of', 'is_empty', 'is_not_empty'],
    values: (value) => /^(user|team):[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  },
  status: {
    operators: ['one_of', 'none_of'],
    values: (value) => ['Open', 'On Hold', 'In Progress', 'Completed'].includes(value),
  },
  due_date: {
    operators: ['on', 'before', 'after', 'between', 'is_empty', 'is_not_empty'],
    values: isCalendarDate,
  },
  start_date: {
    operators: ['on', 'before', 'after', 'between', 'is_empty', 'is_not_empty'],
    values: isCalendarDate,
  },
  priority: {
    operators: ['one_of', 'none_of', 'is_empty', 'is_not_empty'],
    values: (value) => ['None', 'Low', 'Medium', 'High', 'Urgent'].includes(value),
  },
  work_type: {
    operators: ['one_of', 'none_of'],
    values: (value) => ['reactive', 'preventive'].includes(value),
  },
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function normalizeWorkOrderFilters(filters = []) {
  if (!Array.isArray(filters)) return []
  const seenFields = new Set()
  const normalized = []

  for (const filter of filters) {
    const rule = filterRules[filter?.field]
    const field = filter?.field
    const operator = filter?.operator
    if (!rule || seenFields.has(field) || !rule.operators.includes(operator)) continue
    seenFields.add(field)

    const values = [...new Set((Array.isArray(filter.values) ? filter.values : [])
      .filter((value) => typeof value === 'string' && rule.values(value)))].slice(0, 50)
    const isEmptyOperator = operator === 'is_empty' || operator === 'is_not_empty'
    const isDateRange = operator === 'between'
    const isDateOperator = ['on', 'before', 'after', 'between'].includes(operator)

    if (isEmptyOperator) {
      normalized.push({ field, operator, values: [] })
      continue
    }
    if (isDateRange && (values.length !== 2 || values[0] > values[1])) continue
    if (isDateOperator && values.length !== (isDateRange ? 2 : 1)) continue
    if (!isDateOperator && values.length === 0) continue

    normalized.push({ field, operator, values })
  }

  return normalized
}

function assignedTargets(order) {
  const targets = new Set()
  if (order.assigned_to) targets.add(`user:${order.assigned_to}`)
  if (order.team_id) targets.add(`team:${order.team_id}`)
  for (const assignment of order.work_order_assignments ?? []) {
    if (assignment.user_id) targets.add(`user:${assignment.user_id}`)
    if (assignment.team_id) targets.add(`team:${assignment.team_id}`)
  }
  return targets
}

function matchesDate(value, operator, values) {
  if (operator === 'is_empty') return !value
  if (operator === 'is_not_empty') return Boolean(value)
  if (!value) return false
  if (operator === 'on') return value === values[0]
  if (operator === 'before') return value < values[0]
  if (operator === 'after') return value > values[0]
  if (operator === 'between') return value >= values[0] && value <= values[1]
  return false
}

export function matchesWorkOrderFilters(order, filters = []) {
  return normalizeWorkOrderFilters(filters).every((filter) => {
    const { field, operator, values } = filter
    if (field === 'assigned_to') {
      const targets = assignedTargets(order)
      if (operator === 'is_empty') return targets.size === 0
      if (operator === 'is_not_empty') return targets.size > 0
      const hasMatch = values.some((value) => targets.has(value))
      return operator === 'one_of' ? hasMatch : !hasMatch
    }
    if (field === 'due_date' || field === 'start_date') return matchesDate(order[field], operator, values)
    if (field === 'priority') {
      if (operator === 'is_empty') return order.priority == null
      if (operator === 'is_not_empty') return order.priority != null
      const hasMatch = values.some((value) => value === 'None' ? order.priority == null : value === order.priority)
      return operator === 'one_of' ? hasMatch : !hasMatch
    }
    const hasMatch = values.includes(order[field])
    return operator === 'one_of' ? hasMatch : !hasMatch
  })
}
