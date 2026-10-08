import { Settings } from 'lucide-react'
import { useWorkspace } from './useWorkspace'
import './MobileAppHeader.css'

export function MobileAppHeader({ onNavigate }) {
  const workspace = useWorkspace()

  return (
    <header className="mobile-app-header">
      <p className="mobile-app-header-title">{workspace.organization?.name || 'Workbench'}</p>
      <button type="button" className="mobile-app-header-account" onClick={() => onNavigate('Settings / Profile Preferences')}>
        <Settings size={26} strokeWidth={1.8} aria-hidden="true" />
        <span>Account</span>
      </button>
    </header>
  )
}
