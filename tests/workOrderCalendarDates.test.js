import { describe, expect, it } from 'vitest'
import { addCalendarDays, getWorkOrderCalendarRange, shiftCalendarMonth, startOfCalendarWeek } from '../src/pages/work-orders/workOrderCalendarDates'

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
})
