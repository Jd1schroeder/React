import { PanelView } from '../components/layout/PanelView'
import { scaffoldPages } from '../data/mockData'

export function ScaffoldPage({ pageName }) {
  const config = scaffoldPages[pageName] ?? scaffoldPages.Reporting
  const items = config.stats.map(([label, value], index) => ({ id: `${pageName}-${index}`, name: label, meta: value, updated: 'Today' }))
  return <PanelView title={pageName} actionLabel={config.action} items={items} filters={['Status', 'Owner']} kind="record" />
}
