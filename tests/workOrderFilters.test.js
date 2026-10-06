import { describe, expect, it } from 'vitest'
import { matchesWorkOrderFilters, normalizeWorkOrderFilters } from '../src/utils/workOrderFilters'

describe('Work Order filters', () => {
  it('normalizes supported filters and ignores duplicate, malformed, or empty selections', () => {
    expect(normalizeWorkOrderFilters([
      { field: 'status', operator: 'one_of', values: ['Open', 'Open', 'Invalid'] },
      { field: 'status', operator: 'none_of', values: ['Done'] },
      { field: 'priority', operator: 'is_empty', values: ['High'] },
      { field: 'due_date', operator: 'between', values: ['2026-10-09', '2026-10-08'] },
      { field: 'unknown', operator: 'one_of', values: ['value'] },
    ])).toEqual([
      { field: 'status', operator: 'one_of', values: ['Open'] },
      { field: 'priority', operator: 'is_empty', values: [] },
    ])
  })

  it('matches assignment, status, priority, work type, and inclusive date ranges together', () => {
    const order = {
      status: 'In Progress',
      priority: 'High',
      work_type: 'preventive',
      due_date: '2026-10-09',
      start_date: '2026-10-01',
      assigned_to: null,
      team_id: 'a0000000-0000-4000-8000-000000000001',
      work_order_assignments: [],
    }
    const filters = [
      { field: 'assigned_to', operator: 'one_of', values: ['team:a0000000-0000-4000-8000-000000000001'] },
      { field: 'status', operator: 'none_of', values: ['Open', 'Completed'] },
      { field: 'priority', operator: 'one_of', values: ['High', 'Urgent'] },
      { field: 'work_type', operator: 'one_of', values: ['preventive'] },
      { field: 'due_date', operator: 'between', values: ['2026-10-08', '2026-10-10'] },
      { field: 'start_date', operator: 'before', values: ['2026-10-02'] },
    ]

    expect(matchesWorkOrderFilters(order, filters)).toBe(true)
    expect(matchesWorkOrderFilters(order, [...filters, { field: 'priority', operator: 'none_of', values: ['High'] }])).toBe(true)
    expect(matchesWorkOrderFilters({ ...order, due_date: null }, filters)).toBe(false)
  })

  it('supports empty and not-empty assignment and priority filters', () => {
    expect(matchesWorkOrderFilters({ priority: null }, [
      { field: 'priority', operator: 'is_empty', values: [] },
      { field: 'assigned_to', operator: 'is_empty', values: [] },
    ])).toBe(true)
    expect(matchesWorkOrderFilters({ priority: 'Low', work_order_assignments: [{ user_id: 'a0000000-0000-4000-8000-000000000002' }] }, [
      { field: 'priority', operator: 'is_not_empty', values: [] },
      { field: 'assigned_to', operator: 'is_not_empty', values: [] },
    ])).toBe(true)
  })

  it('matches None priority alongside selected concrete priorities', () => {
    const filter = [{ field: 'priority', operator: 'one_of', values: ['None', 'High'] }]

    expect(matchesWorkOrderFilters({ priority: null }, filter)).toBe(true)
    expect(matchesWorkOrderFilters({ priority: 'High' }, filter)).toBe(true)
    expect(matchesWorkOrderFilters({ priority: 'Low' }, filter)).toBe(false)
    expect(matchesWorkOrderFilters({ priority: null }, [{ ...filter[0], operator: 'none_of' }])).toBe(false)
  })
})
