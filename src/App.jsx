import { Component, Suspense, useCallback, useEffect } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { UnsavedChangesProvider } from './components/layout/UnsavedChangesProvider'
import { useUnsavedChanges } from './components/layout/useUnsavedChanges'
import { getPagePath, getRecordPath, pagePaths } from './routes.js'
import { authenticatedRoutes, pages, publicRoutes, recordPageNames, recordRoutes } from './routes/routeConfig.jsx'
import './styles/tokens.css'
import './styles/breakpoints.css'
import './styles/globals.css'
import './App.css'

function PageLoading() {
  return <div className="workspace-loading" aria-busy="true" aria-label="Loading page" />
}

class RouteErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <main className="workspace-load-error"><h1>Unable to load this page</h1><p>Refresh to try again.</p><button type="button" onClick={() => window.location.reload()}>Refresh</button></main>
    }
    return this.props.children
  }
}

function PageRoute({ pageName, isPublic = false }) {
  const Page = pages[pageName] ?? pages.NotFound
  const navigate = useNavigate()
  const { guardNavigation } = useUnsavedChanges()
  const { recordId, userId } = useParams()
  const onNavigate = useCallback((target) => guardNavigation(() => navigate(target.startsWith('/') ? target : getPagePath(target))), [guardNavigation, navigate])
  const onNavigateRecord = useCallback((type, id) => guardNavigation(() => navigate(getRecordPath(type, id))), [guardNavigation, navigate])
  const content = <RouteErrorBoundary><Page pageName={pageName} recordId={recordId} userId={userId} onNavigate={onNavigate} onNavigateRecord={onNavigateRecord} /></RouteErrorBoundary>

  if (isPublic) return content
  return <AppLayout activePage={pageName} onNavigate={onNavigate}>{content}</AppLayout>
}

function LegacyHashRedirect() {
  const navigate = useNavigate()
  const hashPage = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))

  useEffect(() => {
    if (hashPage && pagePaths[hashPage]) navigate(getPagePath(hashPage), { replace: true })
  }, [hashPage, navigate])

  return <PageRoute pageName="Splash" isPublic />
}

function AppRoot() {
  return <UnsavedChangesProvider><Suspense fallback={<PageLoading />}><Outlet /></Suspense></UnsavedChangesProvider>
}

const router = createBrowserRouter([
  {
    element: <AppRoot />,
    children: [
      { path: '/', element: <LegacyHashRedirect /> },
      { path: '/teams/users', element: <Navigate to="/users" replace /> },
      { path: '/settings/manage-teammates', element: <Navigate to="/settings/teammates/users" replace /> },
      { path: '/users/profile/:userId', element: <PageRoute pageName="User Profile" /> },
      ...publicRoutes.slice(1).map(([path, page]) => ({ path, element: <PageRoute pageName={page} isPublic /> })),
      ...authenticatedRoutes.map(({ path, page }) => ({ path, element: <PageRoute pageName={page} /> })),
      ...recordRoutes.map((type) => ({ path: `/${type}/:recordId`, element: <PageRoute pageName={recordPageNames[type]} /> })),
      { path: '*', element: <PageRoute pageName="NotFound" /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />
}

export default App
