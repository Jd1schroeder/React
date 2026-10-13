import { ArrowLeft, Settings } from 'lucide-react'
import { useWorkspace } from './useWorkspace'
import './MobileAppHeader.css'

export function MobileAppHeader({ activePage, titleOverride, onNavigate, onNavigateBack }) {
  const workspace = useWorkspace()
  const isAccountPage = ['Settings / Profile Preferences', 'Settings / Edit Account', 'Settings / Linked Device', 'Settings / Notification Settings'].includes(activePage)
  const isOrganizationSettingsPage = activePage === 'Settings / General'
  const isWorkOrderTrackingTypesPage = ['Settings / Features / Work Order Cost Types', 'Settings / Features / Work Order Time Types'].includes(activePage)
  const pageTitle = activePage === 'Settings / Edit Account' ? 'Edit Account' : activePage === 'Settings / Linked Device' ? 'Linked Device' : activePage === 'Settings / Notification Settings' ? 'Notification Settings' : 'My Account'
  const title = isOrganizationSettingsPage ? 'Organization Settings' : activePage === 'Settings / Features / Work Order Cost Types' ? 'Custom Work Order Cost Types' : activePage === 'Settings / Features / Work Order Time Types' ? 'Custom Work Order Time Types' : activePage === 'Settings / Notification Settings' && titleOverride ? titleOverride : pageTitle

  return (
    <header className={`mobile-app-header${isAccountPage ? ' is-my-account' : ''}${isOrganizationSettingsPage || isWorkOrderTrackingTypesPage ? ' is-page-header' : ''}`}>
      {isAccountPage || isOrganizationSettingsPage || isWorkOrderTrackingTypesPage ? <>
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
