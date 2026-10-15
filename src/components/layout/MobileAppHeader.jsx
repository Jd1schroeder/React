import { ArrowLeft, Settings } from 'lucide-react'
import { useWorkspace } from './useWorkspace'
import './MobileAppHeader.css'

const organizationSettingsTitles = {
  'Settings / General': 'General',
  'Settings / Features': 'Features',
  'Settings / Features / Work Orders': 'Work Orders',
  'Settings / Features / Work Order': 'Work Orders',
  'Settings / Features / External Work Orders': 'External Work Orders',
  'Settings / Subscription': 'Subscription',
  'Settings / Manage Teammates': 'Manage Teammates',
  'Settings / Teammates / Teams': 'Teams',
  'Settings / Teammates / Roles': 'Roles',
  'Settings / Customizations': 'Customizations',
  'Settings / Integrations': 'Integrations',
}

export function MobileAppHeader({ activePage, titleOverride, onNavigate, onNavigateBack }) {
  const workspace = useWorkspace()
  const isAccountPage = ['Settings / Profile Preferences', 'Settings / Edit Account', 'Settings / Linked Device', 'Settings / Notification Settings'].includes(activePage)
  const isToolsPage = activePage === 'Tools'
  const isDashboardPage = activePage === 'Dashboard'
  const isOrganizationSettingsPage = Boolean(organizationSettingsTitles[activePage])
  const isWorkOrderTrackingTypesPage = ['Settings / Features / Work Order Cost Types', 'Settings / Features / Work Order Time Types'].includes(activePage)
  const pageTitle = activePage === 'Settings / Edit Account' ? 'Edit Account' : activePage === 'Settings / Linked Device' ? 'Linked Device' : activePage === 'Settings / Notification Settings' ? 'Notification Settings' : 'My Account'
  const title = titleOverride || organizationSettingsTitles[activePage] || (activePage === 'Settings / Features / Work Order Cost Types' ? 'Custom Work Order Cost Types' : activePage === 'Settings / Features / Work Order Time Types' ? 'Custom Work Order Time Types' : pageTitle)
  const isPageHeader = isAccountPage || isOrganizationSettingsPage || isWorkOrderTrackingTypesPage

  return (
    <header className={`mobile-app-header${isAccountPage ? ' is-my-account' : ''}${isPageHeader ? ' is-page-header' : ''}`}>
      {isPageHeader ? <>
        <button type="button" className="mobile-app-header-back" onClick={onNavigateBack} aria-label="Back">
          <ArrowLeft size={26} aria-hidden="true" />
        </button>
        <h1 className="mobile-app-header-title">{title}</h1>
      </> : <>
        <p className="mobile-app-header-title">{isToolsPage ? 'Tools' : isOrganizationSettingsPage ? title : workspace.organization?.name || 'Workbench'}</p>
        {isDashboardPage && <button type="button" className="mobile-app-header-account" onClick={() => onNavigate('Settings / Profile Preferences')}>
          <Settings size={26} strokeWidth={1.8} aria-hidden="true" />
          <span>Account</span>
        </button>}
      </>}
    </header>
  )
}
