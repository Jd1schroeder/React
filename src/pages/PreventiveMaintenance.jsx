import { PanelView } from '../components/layout/PanelView'

export function PreventiveMaintenance() {
  const pmSchedules = []
  const items = pmSchedules.map((schedule, index) => ({ id: `schedule-${index}`, name: schedule.name, asset: schedule.asset, location: schedule.frequency, meta: `Next due ${schedule.nextDue}`, value: schedule.status, unit: 'Schedule status', frequency: schedule.frequency, updated: 'Today' }))
  return <PanelView title="Maintenance Plans" searchPlaceholder="Search Maintenance Plans" actionLabel="Create schedule" filters={['Asset', 'Frequency', 'Status']} items={items} kind="schedule" />
}
