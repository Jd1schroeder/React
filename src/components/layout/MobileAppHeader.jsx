import { ArrowLeft, Settings } from 'lucide-react'
import { useWorkspace } from './useWorkspace'
import './MobileAppHeader.css'

export function MobileAppHeader({ activePage, onNavigate, onNavigateBack }) {
  const workspace = useWorkspace()
  const isAccountPage = ['Settings / Profile Preferences', 'Settings / Edit Account', 'Settings / Linked Device'].includes(activePage)
  const title = activePage === 'Settings / Edit Account' ? 'Edit Account' : activePage === 'Settings / Linked Device' ? 'Linked Device' : 'My Account'

  return (
    <header className={`mobile-app-header${isAccountPage ? ' is-my-account' : ''}`}>
      {isAccountPage ? <>
        <button type="button" className="mobile-app-header-back" onClick={onNavigateBack} aria-label="Back">
          <ArrowLeft size={26} aria-hidden="true" />
        </button>
        <h1 className="mobile-app-header-title">{title}</h1>
      </> : <>
        <p className="mobile-app-header-title">{workspace.organization?.name || 'Workbench'}</p>
        <button type="button" className="mobile-app-header-account" onClick={() => onNavigate('Settings / Profile Preferences')}>
          <Settings size={26} strokeWidth={1.8} aria-hidden="true" />
          <span>Account</span>
        </button>
      </>}
    </header>
  )
}
