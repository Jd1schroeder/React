import { PanelView } from '../components/layout/PanelView'
import { useWorkspace } from '../components/layout/useWorkspace'
import { getFeatureLabel } from '../utils/featureLabels'

export function Assets({ recordId, onNavigateRecord, onNavigate }) {
  const workspace = useWorkspace()
  const assetLabel = getFeatureLabel(workspace.organization?.feature_labels, 'asset')
  const assets = []
  const items = assets.map((asset) => ({ id: asset.id, name: asset.name, asset: asset.category, location: asset.location, meta: `${asset.openWorkOrders} open work orders`, value: asset.health, unit: 'Health status', frequency: 'As needed', updated: 'Today' }))
  return <PanelView title={assetLabel} searchPlaceholder={`Search ${assetLabel}`} actionLabel={`Add ${getFeatureLabel(workspace.organization?.feature_labels, 'asset', 'singular').toLowerCase()}`} filters={['Status', 'Location', 'Category']} items={items} kind="asset" recordId={recordId} recordType="assets" onNavigateRecord={onNavigateRecord} onNavigate={onNavigate} />
}
