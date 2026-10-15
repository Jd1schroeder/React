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

  it('normalizes and matches single-select custom fields with multiple selections', () => {
    const customFields = [{ id: 'custom-tool', type: 'single_select', options: ['Dew Point Meter', 'Manual Grease Gun'] }]
    const filters = [{ field: 'custom-tool', operator: 'one_of', values: ['Dew Point Meter', 'Manual Grease Gun'] }]
    const order = { custom_field_values: { 'custom-tool': 'Manual Grease Gun' } }

    expect(normalizeWorkOrderFilters(filters, customFields)).toEqual(filters)
    expect(matchesWorkOrderFilters(order, filters, customFields)).toBe(true)
    expect(matchesWorkOrderFilters({ custom_field_values: {} }, filters, customFields)).toBe(false)
    expect(matchesWorkOrderFilters({ custom_field_values: {} }, [{ field: 'custom-tool', operator: 'is_empty', values: [] }], customFields)).toBe(true)
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-tool', operator: 'is_not_empty', values: [] }], customFields)).toBe(true)
  })

  it('normalizes and matches Single Line Text filters case-insensitively', () => {
    const customFields = [{ id: 'custom-reference', type: 'text' }]
    const order = { custom_field_values: { 'custom-reference': 'Pump room west' } }

    expect(normalizeWorkOrderFilters([{ field: 'custom-reference', operator: 'contains', values: ['ROOM'] }], customFields)).toEqual([
      { field: 'custom-reference', operator: 'contains', values: ['ROOM'] },
    ])
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-reference', operator: 'contains', values: ['room'] }], customFields)).toBe(true)
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-reference', operator: 'not_contains', values: ['north'] }], customFields)).toBe(true)
    expect(matchesWorkOrderFilters({ custom_field_values: {} }, [{ field: 'custom-reference', operator: 'is_empty', values: [] }], customFields)).toBe(true)
  })

  it('normalizes and matches Multi-Line Text filters case-insensitively', () => {
    const customFields = [{ id: 'custom-notes', type: 'long_text' }]
    const order = { custom_field_values: { 'custom-notes': 'Pump room west' } }

    expect(normalizeWorkOrderFilters([{ field: 'custom-notes', operator: 'contains', values: ['ROOM'] }], customFields)).toEqual([
      { field: 'custom-notes', operator: 'contains', values: ['ROOM'] },
    ])
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-notes', operator: 'contains', values: ['room'] }], customFields)).toBe(true)
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-notes', operator: 'not_contains', values: ['north'] }], customFields)).toBe(true)
  })

  it('normalizes and matches Date & Time presets', () => {
    const customFields = [{ id: 'custom-inspection', type: 'datetime' }]
    const today = new Date()
    const todayValue = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30).toISOString()
    const order = { custom_field_values: { 'custom-inspection': todayValue } }

    expect(normalizeWorkOrderFilters([{ field: 'custom-inspection', operator: 'one_of', values: ['today'] }], customFields)).toEqual([
      { field: 'custom-inspection', operator: 'one_of', values: ['today'] },
    ])
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-inspection', operator: 'one_of', values: ['today'] }], customFields)).toBe(true)
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-inspection', operator: 'none_of', values: ['tomorrow'] }], customFields)).toBe(true)
  })

  it('normalizes and matches Date presets', () => {
    const customFields = [{ id: 'custom-service-date', type: 'date' }]
    const today = new Date()
    const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const order = { custom_field_values: { 'custom-service-date': todayValue } }

    expect(matchesWorkOrderFilters(order, [{ field: 'custom-service-date', operator: 'one_of', values: ['today'] }], customFields)).toBe(true)
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-service-date', operator: 'none_of', values: ['tomorrow'] }], customFields)).toBe(true)
  })

  it('normalizes and matches Number contains filters', () => {
    const customFields = [{ id: 'custom-meter', type: 'number' }]
    const order = { custom_field_values: { 'custom-meter': 120 } }

    expect(matchesWorkOrderFilters(order, [{ field: 'custom-meter', operator: 'contains', values: ['12'] }], customFields)).toBe(true)
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-meter', operator: 'not_contains', values: ['99'] }], customFields)).toBe(true)
  })

  it('normalizes and matches Link contains filters', () => {
    const customFields = [{ id: 'custom-link', type: 'link' }]
    const order = { custom_field_values: { 'custom-link': 'https://www.google.com' } }

    expect(matchesWorkOrderFilters(order, [{ field: 'custom-link', operator: 'contains', values: ['google.com'] }], customFields)).toBe(true)
    expect(matchesWorkOrderFilters(order, [{ field: 'custom-link', operator: 'not_contains', values: ['example.com'] }], customFields)).toBe(true)
  })
})
