import { PanelView } from '../components/layout/PanelView'
import { useWorkspace } from '../components/layout/useWorkspace'
import { getFeatureLabel } from '../utils/featureLabels'

export function PreventiveMaintenance({ recordId, onNavigateRecord, onNavigate }) {
  const workspace = useWorkspace()
  const labels = workspace.organization?.feature_labels
  const planLabel = getFeatureLabel(labels, 'maintenancePlan')
  const pmSchedules = []
  const items = pmSchedules.map((schedule, index) => ({ id: `schedule-${index}`, name: schedule.name, asset: schedule.asset, location: schedule.frequency, meta: `Next due ${schedule.nextDue}`, value: schedule.status, unit: 'Schedule status', frequency: schedule.frequency, updated: 'Today' }))
  return <PanelView title={planLabel} searchPlaceholder={`Search ${planLabel}`} actionLabel={`Create ${getFeatureLabel(labels, 'maintenancePlan', 'singular').toLowerCase()}`} filters={['Asset', 'Frequency', 'Status']} items={items} kind="schedule" recordId={recordId} recordType="maintenance-plans" onNavigateRecord={onNavigateRecord} onNavigate={onNavigate} />
}
