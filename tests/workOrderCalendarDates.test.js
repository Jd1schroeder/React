import { describe, expect, it } from 'vitest'
import { addCalendarDays, buildWorkOrderCalendarMarkers, getWorkOrderCalendarRange, shiftCalendarMonth, startOfCalendarWeek } from '../src/pages/work-orders/workOrderCalendarDates'

describe('Work Order calendar dates', () => {
  it('uses Sunday as the first day of a week', () => {
    expect(startOfCalendarWeek('2026-10-08')).toBe('2026-10-04')
    expect(addCalendarDays('2026-10-04', 6)).toBe('2026-10-10')
  })

  it('includes the full visible week in weekly date queries', () => {
    expect(getWorkOrderCalendarRange('week', '2026-10-08')).toEqual({
      startDate: '2026-10-04',
      endDate: '2026-10-10',
    })
  })

  it('includes adjacent-month dates in the monthly calendar grid', () => {
    expect(getWorkOrderCalendarRange('month', '2026-10-08')).toEqual({
      startDate: '2026-09-27',
      endDate: '2026-10-31',
    })
  })

  it('clamps month navigation to the last valid day', () => {
    expect(shiftCalendarMonth('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('marks completed Work Orders green instead of open blue', () => {
    expect(buildWorkOrderCalendarMarkers([
      { due_date: '2026-10-08', status: 'Completed' },
      { due_date: '2026-10-09', status: 'Open' },
    ], '2026-10-09')).toEqual({
      '2026-10-08': { open: 0, completed: 1, late: 0 },
      '2026-10-09': { open: 1, completed: 0, late: 0 },
    })
  })

  it('marks overdue incomplete Work Orders red instead of open blue', () => {
    expect(buildWorkOrderCalendarMarkers([
      { due_date: '2026-10-08', status: 'In Progress' },
    ], '2026-10-09')).toEqual({
      '2026-10-08': { open: 0, completed: 0, late: 1 },
    })
  })

  it('marks overdue Work Orders red instead of blue while completed Work Orders remain green', () => {
    expect(buildWorkOrderCalendarMarkers([
      { due_date: '2026-10-08', status: 'Open' },
      { due_date: '2026-10-08', status: 'Completed' },
      { due_date: '2026-10-08', status: 'In Progress' },
    ], '2026-10-09')).toEqual({
      '2026-10-08': { open: 0, completed: 1, late: 2 },
    })
  })
})
