import { PanelView } from '../components/layout/PanelView'
import { useWorkspace } from '../components/layout/useWorkspace'
import { getFeatureLabel } from '../utils/featureLabels'

export function PartsInventory({ recordId, onNavigateRecord, onNavigate }) {
  const workspace = useWorkspace()
  const labels = workspace.organization?.feature_labels
  const partLabel = getFeatureLabel(labels, 'part')
  const parts = []
  const items = parts.map((part) => ({
    id: part.id,
    name: part.name,
    asset: part.category,
    location: part.location,
    meta: `${part.quantity} in stock`,
    value: part.quantity <= part.reorderPoint ? 'Reorder needed' : 'In stock',
    unit: 'Quantity',
    frequency: `Reorder at ${part.reorderPoint}`,
    updated: 'Today',
  }))

  return (
    <PanelView
      title={partLabel}
      searchPlaceholder={`Search ${partLabel.toLowerCase()}`}
      actionLabel={`Add ${getFeatureLabel(labels, 'part', 'singular').toLowerCase()}`}
      filters={['Status', 'Location', 'Category']}
      items={items}
      kind="part"
      recordId={recordId}
      recordType="parts"
      onNavigateRecord={onNavigateRecord}
      onNavigate={onNavigate}
    />
  )
}
