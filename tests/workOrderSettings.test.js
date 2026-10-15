import { describe, expect, it } from 'vitest'
import { getWorkOrderScheduleRequirementError, normalizeWorkOrderScheduleRequirement } from '../src/utils/workOrderSettings'

describe('Work Order schedule settings', () => {
  it('normalizes unknown policies to no required date', () => {
    expect(normalizeWorkOrderScheduleRequirement('unexpected')).toBe('none')
  })

  it('reports only the dates required by the organization policy', () => {
    expect(getWorkOrderScheduleRequirementError('due_date', { startDate: '2026-10-10' })).toContain('due date')
    expect(getWorkOrderScheduleRequirementError('start_date', { dueDate: '2026-10-16' })).toContain('start date')
    expect(getWorkOrderScheduleRequirementError('both')).toContain('due date and start date')
    expect(getWorkOrderScheduleRequirementError('both', { dueDate: '2026-10-16', startDate: '2026-10-10' })).toBe('')
  })
})
