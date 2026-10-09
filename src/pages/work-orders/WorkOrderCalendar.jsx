import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WorkOrderListItem } from './WorkOrderList'
import { addCalendarDays, calendarLabelDate, dateFromKey, shiftCalendarMonth, startOfCalendarMonth, startOfCalendarWeek } from './workOrderCalendarDates'
import './WorkOrderCalendar.css'

function periodLabel(view, visibleDate) {
  if (view === 'month') return calendarLabelDate(visibleDate, { month: 'long', year: 'numeric' })
  const first = startOfCalendarWeek(visibleDate)
  const last = addCalendarDays(first, 6)
  const firstDate = dateFromKey(first)
  const lastDate = dateFromKey(last)
  const sameMonth = firstDate.getUTCMonth() === lastDate.getUTCMonth()
  const month = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' })
  const year = new Intl.DateTimeFormat(undefined, { year: 'numeric', timeZone: 'UTC' })
  if (sameMonth) return `${month.format(firstDate)} ${firstDate.getUTCDate()} – ${lastDate.getUTCDate()}, ${year.format(lastDate)}`
  return `${month.format(firstDate)} ${firstDate.getUTCDate()} – ${month.format(lastDate)} ${lastDate.getUTCDate()}, ${year.format(lastDate)}`
}

function selectedDateLabel(key) {
  return calendarLabelDate(key, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function WorkOrderCalendar({ view, selectedDate, onViewChange, onDateChange, markers = {} }) {
  const visibleDate = view === 'week' ? startOfCalendarWeek(selectedDate) : startOfCalendarMonth(selectedDate)
  const firstDate = view === 'week' ? visibleDate : startOfCalendarWeek(visibleDate)
  const dayCount = view === 'week'
    ? 7
    : Math.ceil((dateFromKey(visibleDate).getUTCDay() + new Date(Date.UTC(dateFromKey(visibleDate).getUTCFullYear(), dateFromKey(visibleDate).getUTCMonth() + 1, 0)).getUTCDate()) / 7) * 7
  const dates = Array.from({ length: dayCount }, (_, index) => addCalendarDays(firstDate, index))
  const weekdays = dates.slice(0, 7).map((key) => calendarLabelDate(key, { weekday: 'short' }))
  const currentMonth = dateFromKey(visibleDate).getUTCMonth()

  const movePeriod = (amount) => {
    const nextDate = view === 'week' ? addCalendarDays(selectedDate, amount * 7) : shiftCalendarMonth(selectedDate, amount)
    onDateChange(nextDate)
  }

  return <section className={`work-order-calendar is-${view}`} aria-label={`${view === 'week' ? 'Weekly' : 'Monthly'} Work Order calendar`}>
    <button type="button" className="work-order-calendar-switch" onClick={() => onViewChange(view === 'week' ? 'month' : 'week')}>
      Switch to {view === 'week' ? 'Month' : 'Week'} View
    </button>
    <div className="work-order-calendar-period">
      <button type="button" aria-label={view === 'week' ? 'Previous week' : 'Previous month'} onClick={() => movePeriod(-1)}>
        <ChevronLeft aria-hidden="true" />
      </button>
      <h2>{periodLabel(view, visibleDate)}</h2>
      <button type="button" aria-label={view === 'week' ? 'Next week' : 'Next month'} onClick={() => movePeriod(1)}>
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
    <div className="work-order-calendar-grid" role="group" aria-label={periodLabel(view, visibleDate)}>
      {weekdays.map((weekday, index) => <div className="work-order-calendar-weekday" aria-hidden="true" key={`${weekday}-${index}`}>{weekday}</div>)}
      {dates.map((key) => {
        const marker = markers[key]
        const hasMarkers = marker?.open > 0 || marker?.completed > 0 || marker?.late > 0
        const outsideMonth = dateFromKey(key).getUTCMonth() !== currentMonth
        return <button
          key={key}
          type="button"
          className={`work-order-calendar-day${selectedDate === key ? ' is-selected' : ''}${outsideMonth ? ' is-outside-month' : ''}`}
          aria-label={`${calendarLabelDate(key, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${marker ? `, ${marker.open} open, ${marker.completed} completed, and ${marker.late} late Work Orders` : ''}`}
          aria-pressed={selectedDate === key}
          onClick={() => onDateChange(key)}
        >
          <span className="work-order-calendar-day-number">{dateFromKey(key).getUTCDate()}</span>
          {hasMarkers && <span className="work-order-calendar-markers" aria-hidden="true">
            {marker?.open > 0 && <i className="is-open" />}
            {marker?.completed > 0 && <i className="is-completed" />}
            {marker?.late > 0 && <i className="is-late" />}
          </span>}
        </button>
      })}
    </div>
    <h3 className="work-order-calendar-selected-date">{selectedDateLabel(selectedDate)}</h3>
  </section>
}

export function WorkOrderCalendarResults({ orders, loading, error, selected, readStatusById, onSelect, onStatusChange, canChangeStatusForOrder }) {
  return <section className="work-order-list work-order-calendar-results" aria-label="Work Orders for selected date">
    {loading && <p className="work-order-calendar-results-message" role="status">Loading Work Orders...</p>}
    {!loading && error && <p className="work-order-calendar-results-message" role="alert">{error}</p>}
    {!loading && !error && orders.length === 0 && <p className="work-order-calendar-results-message">No Work Orders due on this date.</p>}
    {!loading && !error && orders.map((order) => <WorkOrderListItem
      key={order.id}
      order={order}
      selected={selected?.id === order.id}
      isRead={Boolean(readStatusById[order.id]?.is_read ?? order.is_read)}
      onSelect={onSelect}
      onStatusChange={onStatusChange}
      canChangeStatus={canChangeStatusForOrder(order)}
    />)}
  </section>
}
