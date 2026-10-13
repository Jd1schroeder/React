import { MobileActionSheet } from './MobileActionSheet'
import { organizationPages, settings } from '../../pages/settings/settingsConfig'

export function MobileSettingsSheet({ onClose, onNavigate }) {
  const selectSettingsPage = (page) => {
    onClose()
    onNavigate(page)
  }

  return <MobileActionSheet title="Organization Settings" onClose={onClose}>
    {organizationPages.map((page) => <button key={page} type="button" onClick={() => selectSettingsPage(page)}>{settings[page].title}</button>)}
  </MobileActionSheet>
}
