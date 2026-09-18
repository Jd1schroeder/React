import { PanelView } from '../components/layout/PanelView'

const meters = []

export function Meters() {
  return <PanelView title="Meters" searchPlaceholder="Search Meters" actionLabel="New meter" filters={['Asset', 'Location', 'Meter Type']} items={meters} kind="meter" />
}
