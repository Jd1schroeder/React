import { PanelView } from '../components/layout/PanelView'
import { useWorkspace } from '../components/layout/useWorkspace'
import { getPagePath } from '../routes.js'
import { getFeatureLabel, getFeatureLabelKey } from '../utils/featureLabels'

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
  const workspace = useWorkspace()
  const labelKey = getFeatureLabelKey(pageName)
  const title = labelKey ? getFeatureLabel(workspace.organization?.feature_labels, labelKey) : pageName
  return <PanelView title={title} actionLabel={pageActions[pageName] ?? 'Create item'} items={[]} filters={['Status', 'Owner']} kind="record" recordId={recordId} listPath={getPagePath(pageName)} onNavigate={onNavigate} />
}
