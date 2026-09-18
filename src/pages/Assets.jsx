import { PanelView } from '../components/layout/PanelView'

export function Assets({ recordId, onNavigateRecord }) {
  const assets = []
  const items = assets.map((asset) => ({ id: asset.id, name: asset.name, asset: asset.category, location: asset.location, meta: `${asset.openWorkOrders} open work orders`, value: asset.health, unit: 'Health status', frequency: 'As needed', updated: 'Today' }))
  return <PanelView title="Assets" searchPlaceholder="Search Assets" actionLabel="Add asset" filters={['Status', 'Location', 'Category']} items={items} kind="asset" recordId={recordId} recordType="assets" onNavigateRecord={onNavigateRecord} />
}
