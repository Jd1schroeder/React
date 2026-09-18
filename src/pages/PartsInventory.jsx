import { PanelView } from '../components/layout/PanelView'
import { parts } from '../data/mockData'

export function PartsInventory({ recordId, onNavigateRecord }) {
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
      title="Parts inventory"
      searchPlaceholder="Search parts"
      actionLabel="Add part"
      filters={['Status', 'Location', 'Category']}
      items={items}
      kind="part"
      recordId={recordId}
      recordType="parts"
      onNavigateRecord={onNavigateRecord}
    />
  )
}
