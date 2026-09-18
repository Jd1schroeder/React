import { PanelView } from '../components/layout/PanelView'

const meters = [
  { id: 'meter-1', name: 'Air Compressor 1 Discharge Temperature', asset: 'Air Compressor 1', location: 'Compressor Room', lastReading: 'Last Reading: 79 Fahrenheit', value: '79', unit: 'Fahrenheit', frequency: 'Daily', updated: 'Today', automations: 0 },
  { id: 'meter-2', name: 'Air Compressor 1 Line Pressure', asset: 'Air Compressor 1', location: 'Compressor Room', lastReading: 'Last Reading: 101 PSI', value: '101', unit: 'PSI', frequency: 'Daily', updated: 'Today', automations: 1 },
  { id: 'meter-3', name: 'Air Compressor 1 Load Hours', asset: 'Air Compressor 1', location: 'Compressor Room', lastReading: 'Last Reading: 19,721 Hours', value: '19,721', unit: 'Hours', frequency: 'Weekly', updated: 'Yesterday', automations: 0 },
  { id: 'meter-4', name: 'Air Compressor 2 Discharge Temperature', asset: 'Air Compressor 2', location: 'Compressor Room', lastReading: 'Last Reading: 185 Fahrenheit', value: '185', unit: 'Fahrenheit', frequency: 'Daily', updated: 'Today', automations: 0 },
  { id: 'meter-5', name: 'Fire Pump Room Temperature', asset: 'Fire Suppression System', location: 'Fire Pump Room', lastReading: 'Last Reading: 74.3 Fahrenheit', value: '74.3', unit: 'Fahrenheit', frequency: 'Daily', updated: 'Today', automations: 2 },
]

export function Meters() {
  return <PanelView title="Meters" searchPlaceholder="Search Meters" actionLabel="New meter" filters={['Asset', 'Location', 'Meter Type']} items={meters} kind="meter" />
}
