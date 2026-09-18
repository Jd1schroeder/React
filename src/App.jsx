import { useEffect, useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { WorkOrders } from './pages/WorkOrders'
import { Assets } from './pages/Assets'
import { PreventiveMaintenance } from './pages/PreventiveMaintenance'
import { ScaffoldPage } from './pages/ScaffoldPage'
import { Meters } from './pages/Meters'
import { PartsInventory } from './pages/PartsInventory'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { VerifyEmail } from './pages/VerifyEmail'
import { ForgotPassword } from './pages/ForgotPassword'
import { AcceptInvite } from './pages/AcceptInvite'
import { Splash } from './pages/Splash'
import { SettingsPage } from './pages/SettingsPage'
import { TorkPage } from './pages/TorkPage'
import { getPagePath, getRecordPath, getRouteFromLocation, navigateToPath } from './routes'
import './styles/tokens.css'
import './styles/globals.css'
import './App.css'

const pages = {
  Splash,
  Login,
  Signup,
  'Verify Email': VerifyEmail,
  'Forgot Password': ForgotPassword,
  'Accept Invite': AcceptInvite,
  'Settings / General': SettingsPage,
  'Settings / Features': SettingsPage,
  'Settings / Subscription': SettingsPage,
  'Settings / Manage Teammates': SettingsPage,
  'Settings / Customizations': SettingsPage,
  'Settings / Integrations': SettingsPage,
  'Settings / Profile Preferences': SettingsPage,
  'Settings / Notification Settings': SettingsPage,
  'Settings / Invite Users': SettingsPage,
  NotFound: TorkPage,
  Dashboard,
  'Work Orders': WorkOrders,
  Assets,
  PreventiveMaintenance,
  Requests: ScaffoldPage,
  Messages: ScaffoldPage,
  'Purchase Orders': ScaffoldPage,
  Chat: TorkPage,
  Routines: TorkPage,
  History: TorkPage,
  Reporting: ScaffoldPage,
  'Reporting / Work Orders': ScaffoldPage,
  'Reporting / Asset Health': ScaffoldPage,
  'Reporting / Details': ScaffoldPage,
  'Reporting / Activity': ScaffoldPage,
  'Reporting / Exports': ScaffoldPage,
  'Reporting / Dashboards': ScaffoldPage,
  Automations: ScaffoldPage,
  Meters,
  'Parts Inventory': PartsInventory,
  'Maintenance Plans': PreventiveMaintenance,
  Library: ScaffoldPage,
  'Library / Work Orders': ScaffoldPage,
  'Library / Procedures': ScaffoldPage,
  'Library / Safety Data Sheets': ScaffoldPage,
  Categories: ScaffoldPage,
  Locations: ScaffoldPage,
  'Teams / Users': ScaffoldPage,
  Vendors: ScaffoldPage,
}

function App() {
  const [route, setRoute] = useState(() => getRouteFromLocation())
  const activePage = route.page
  const Page = pages[activePage] ?? ScaffoldPage

  useEffect(() => {
    const handleLocationChange = () => setRoute(getRouteFromLocation())
    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  const navigate = (page) => {
    if (page !== activePage) navigateToPath(getPagePath(page))
  }

  const navigateToRecord = (type, id) => {
    navigateToPath(getRecordPath(type, id))
  }

  if (activePage === 'Login') return <Login onNavigate={navigate} />
  if (activePage === 'Signup') return <Signup onNavigate={navigate} />
  if (activePage === 'Verify Email') return <VerifyEmail onNavigate={navigate} />
  if (activePage === 'Forgot Password') return <ForgotPassword onNavigate={navigate} />
  if (activePage === 'Accept Invite') return <AcceptInvite onNavigate={navigate} />
  if (activePage === 'Splash') return <Splash onNavigate={navigate} />
  return (
    <AppLayout activePage={activePage} onNavigate={navigate}>
      <Page
        pageName={activePage}
        recordId={route.recordId}
        onNavigate={navigate}
        onNavigateRecord={navigateToRecord}
      />
    </AppLayout>
  )
}

export default App
