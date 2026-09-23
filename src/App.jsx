import { Component, Suspense, useCallback, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { getPagePath, getRecordPath, pagePaths } from './routes.js'
import { authenticatedRoutes, pages, publicRoutes, recordPageNames, recordRoutes } from './routes/routeConfig.jsx'
import './styles/tokens.css'
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
  const { recordId } = useParams()
  const onNavigate = useCallback((target) => navigate(target.startsWith('/') ? target : getPagePath(target)), [navigate])
  const onNavigateRecord = useCallback((type, id) => navigate(getRecordPath(type, id)), [navigate])
  const content = <RouteErrorBoundary><Page pageName={pageName} recordId={recordId} onNavigate={onNavigate} onNavigateRecord={onNavigateRecord} /></RouteErrorBoundary>

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

function AppRoutes() {
  return <Suspense fallback={<PageLoading />}>
    <Routes>
      <Route path="/" element={<LegacyHashRedirect />} />
      {publicRoutes.slice(1).map(([path, page]) => <Route key={path} path={path} element={<PageRoute pageName={page} isPublic />} />)}
      {authenticatedRoutes.map(({ path, page }) => <Route key={path} path={path} element={<PageRoute pageName={page} />} />)}
      {recordRoutes.map((type) => <Route key={`${type}-record`} path={`/${type}/:recordId`} element={<PageRoute pageName={recordPageNames[type]} />} />)}
      <Route path="*" element={<PageRoute pageName="NotFound" />} />
    </Routes>
  </Suspense>
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}

export default App
