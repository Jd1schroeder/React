import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { WorkOrderCalendar } from '../src/pages/work-orders/WorkOrderCalendar'

afterEach(cleanup)

describe('Work Order calendar markers', () => {
  it('renders each marker category independently when all are present for a date', () => {
    render(<WorkOrderCalendar
      view="week"
      selectedDate="2026-10-08"
      onViewChange={() => {}}
      onDateChange={() => {}}
      markers={{ '2026-10-08': { open: 1, completed: 1, late: 1 } }}
    />)

    const selectedDay = screen.getByRole('button', { name: /Thursday, October 8, 2026/ })
    expect(selectedDay.querySelectorAll('.work-order-calendar-markers i')).toHaveLength(3)
    expect(selectedDay.querySelector('.is-open')).not.toBeNull()
    expect(selectedDay.querySelector('.is-completed')).not.toBeNull()
    expect(selectedDay.querySelector('.is-late')).not.toBeNull()
  })
})
