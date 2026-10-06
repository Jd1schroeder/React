import { PanelView } from '../components/layout/PanelView'
import { getPagePath } from '../routes.js'

const pageActions = {
  Requests: 'Create request',
  Messages: 'Start conversation',
  'Purchase Orders': 'Create purchase order',
  Reporting: 'Create report',
  Automations: 'Create automation',
  'Parts Inventory': 'Add part',
  'Maintenance Plans': 'Create plan',
  Library: 'Add library item',
  Categories: 'Add category',
  Locations: 'Add location',
  'Teams / Users': 'Invite user',
  Vendors: 'Add vendor',
}

export function ScaffoldPage({ pageName, recordId, onNavigate }) {
  return <PanelView title={pageName} actionLabel={pageActions[pageName] ?? 'Create item'} items={[]} filters={['Status', 'Owner']} kind="record" recordId={recordId} listPath={getPagePath(pageName)} onNavigate={onNavigate} />
}
