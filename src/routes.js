const pagePaths = {
  Splash: '/',
  Login: '/login',
  Signup: '/signup',
  'Verify Email': '/verify-email',
  'Forgot Password': '/forgot-password',
  'Settings / General': '/settings/general',
  'Settings / Features': '/settings/features',
  'Settings / Subscription': '/settings/subscription',
  'Settings / Manage Teammates': '/settings/manage-teammates',
  'Settings / Customizations': '/settings/customizations',
  'Settings / Integrations': '/settings/integrations',
  'Settings / My Account': '/settings/my-account',
  'Settings / Profile Preferences': '/settings/profile-preferences',
  'Settings / Notification Settings': '/settings/notification-settings',
  'Settings / Invite Users': '/settings/invite-users',
  Dashboard: '/dashboard',
  'Work Orders': '/workorders',
  Requests: '/requests',
  Messages: '/messages',
  'Purchase Orders': '/purchase-orders',
  Reporting: '/reporting',
  'Reporting / Work Orders': '/reporting/work-orders',
  'Reporting / Asset Health': '/reporting/asset-health',
  'Reporting / Details': '/reporting/details',
  'Reporting / Activity': '/reporting/activity',
  'Reporting / Exports': '/reporting/exports',
  'Reporting / Dashboards': '/reporting/dashboards',
  Automations: '/automations',
  Meters: '/meters',
  Assets: '/assets',
  'Parts Inventory': '/parts',
  'Maintenance Plans': '/maintenance-plans',
  Library: '/library',
  'Library / Work Orders': '/library/work-orders',
  'Library / Procedures': '/library/procedures',
  'Library / Safety Data Sheets': '/library/safety-data-sheets',
  Categories: '/categories',
  Locations: '/locations',
  'Teams / Users': '/teams/users',
  Vendors: '/vendors',
}

const pagesByPath = new Map(
  Object.entries(pagePaths).map(([page, path]) => [path, page]),
)

const recordPageByPrefix = {
  workorders: 'Work Orders',
  assets: 'Assets',
  parts: 'Parts Inventory',
}

export function getPagePath(page) {
  return pagePaths[page] ?? '/workorders'
}

export function getRecordPath(type, id) {
  return `/${type}/${encodeURIComponent(id)}`
}

export function getRouteFromLocation(location = window.location) {
  const pathname = location.pathname.replace(/\/$/, '') || '/'
  const recordMatch = pathname.match(/^\/(workorders|assets|parts)\/([^/]+)$/)

  if (recordMatch) {
    return {
      page: recordPageByPrefix[recordMatch[1]],
      recordId: decodeURIComponent(recordMatch[2]),
    }
  }

  const pathPage = pagesByPath.get(pathname)
  if (pathPage) return { page: pathPage, recordId: null }

  const hashPage = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
  if (hashPage && (pagePaths[hashPage] || hashPage === 'Dashboard')) {
    return { page: hashPage, recordId: null }
  }

  if (pathname === '/' && !location.hash) {
    return { page: 'Splash', recordId: null }
  }

  return { page: 'NotFound', recordId: null }
}

export function navigateToPath(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
