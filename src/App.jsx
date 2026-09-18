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
import { NotFound } from './pages/NotFound'
import { getPagePath, getRecordPath, getRouteFromLocation, navigateToPath } from './routes'
import './styles/tokens.css'
import './styles/globals.css'
import './App.css'

const pages = {
  Login,
  NotFound,
  Dashboard,
  'Work Orders': WorkOrders,
  Assets,
  PreventiveMaintenance,
  Requests: ScaffoldPage,
  Messages: ScaffoldPage,
  'Purchase Orders': ScaffoldPage,
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

  if (activePage === 'Login') return <Login />
  if (activePage === 'NotFound') return <NotFound onNavigate={navigate} />

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
