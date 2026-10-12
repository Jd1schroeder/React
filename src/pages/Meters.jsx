import { PanelView } from '../components/layout/PanelView'
import { useWorkspace } from '../components/layout/useWorkspace'
import { getFeatureLabel } from '../utils/featureLabels'

const meters = []

export function Meters({ recordId, onNavigateRecord, onNavigate }) {
  const workspace = useWorkspace()
  const labels = workspace.organization?.feature_labels
  const meterLabel = getFeatureLabel(labels, 'meter')
  return <PanelView title={meterLabel} searchPlaceholder={`Search ${meterLabel}`} actionLabel={`New ${getFeatureLabel(labels, 'meter', 'singular').toLowerCase()}`} filters={['Asset', 'Location', 'Meter Type']} items={meters} kind="meter" recordId={recordId} recordType="meters" onNavigateRecord={onNavigateRecord} onNavigate={onNavigate} />
}
