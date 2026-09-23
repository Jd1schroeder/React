import { lazy } from 'react'
import { pagePaths } from '../routes.js'

const lazyNamed = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })))

const SplashPage = lazyNamed(() => import('../pages/Splash'), 'Splash')
const LoginPage = lazyNamed(() => import('../pages/Login'), 'Login')
const SignupPage = lazyNamed(() => import('../pages/Signup'), 'Signup')
const VerifyEmailPage = lazyNamed(() => import('../pages/VerifyEmail'), 'VerifyEmail')
const ForgotPasswordPage = lazyNamed(() => import('../pages/ForgotPassword'), 'ForgotPassword')
const AcceptInvitePage = lazyNamed(() => import('../pages/AcceptInvite'), 'AcceptInvite')
const SettingsPage = lazyNamed(() => import('../pages/SettingsPage'), 'SettingsPage')
const DashboardPage = lazyNamed(() => import('../pages/Dashboard'), 'Dashboard')
const WorkOrdersPage = lazyNamed(() => import('../pages/WorkOrders'), 'WorkOrders')
const AssetsPage = lazyNamed(() => import('../pages/Assets'), 'Assets')
const PreventiveMaintenancePage = lazyNamed(() => import('../pages/PreventiveMaintenance'), 'PreventiveMaintenance')
const ScaffoldPage = lazyNamed(() => import('../pages/ScaffoldPage'), 'ScaffoldPage')
const TorkPage = lazyNamed(() => import('../pages/TorkPage'), 'TorkPage')
const MetersPage = lazyNamed(() => import('../pages/Meters'), 'Meters')
const PartsInventoryPage = lazyNamed(() => import('../pages/PartsInventory'), 'PartsInventory')
const UsersPage = lazyNamed(() => import('../pages/UsersPage'), 'UsersPage')
const TeamsPage = lazyNamed(() => import('../pages/TeamsPage'), 'TeamsPage')
const UserProfilePage = lazyNamed(() => import('../pages/UserProfilePage'), 'UserProfilePage')

export const pages = {
  Splash: SplashPage,
  Login: LoginPage,
  Signup: SignupPage,
  'Verify Email': VerifyEmailPage,
  'Forgot Password': ForgotPasswordPage,
  'Accept Invite': AcceptInvitePage,
  'Settings / General': SettingsPage,
  'Settings / Features': SettingsPage,
  'Settings / Subscription': SettingsPage,
  'Settings / Manage Teammates': SettingsPage,
  'Settings / Customizations': SettingsPage,
  'Settings / Integrations': SettingsPage,
  'Settings / Profile Preferences': SettingsPage,
  'Settings / Notification Settings': SettingsPage,
  'Settings / Invite Users': SettingsPage,
  Dashboard: DashboardPage,
  'Work Orders': WorkOrdersPage,
  Assets: AssetsPage,
  PreventiveMaintenance: PreventiveMaintenancePage,
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
  Meters: MetersPage,
  'Parts Inventory': PartsInventoryPage,
  'Maintenance Plans': PreventiveMaintenancePage,
  Library: ScaffoldPage,
  'Library / Work Orders': ScaffoldPage,
  'Library / Procedures': ScaffoldPage,
  'Library / Safety Data Sheets': ScaffoldPage,
  Categories: ScaffoldPage,
  Locations: ScaffoldPage,
  Users: UsersPage,
  Teams: TeamsPage,
  'User Profile': UserProfilePage,
  Vendors: ScaffoldPage,
  NotFound: TorkPage,
}

export const publicRoutes = [
  ['/', 'Splash'],
  ['/login', 'Login'],
  ['/signup', 'Signup'],
  ['/verify-email', 'Verify Email'],
  ['/forgot-password', 'Forgot Password'],
  ['/accept-invite', 'Accept Invite'],
]

export const authenticatedRoutes = Object.entries(pagePaths)
  .filter(([page]) => !publicRoutes.some(([, publicPage]) => publicPage === page))
  .map(([page, path]) => ({ path, page }))

export const recordRoutes = [
  'workorders', 'requests', 'messages', 'purchase-orders', 'reporting',
  'reporting/work-orders', 'reporting/asset-health', 'reporting/details',
  'reporting/activity', 'reporting/exports', 'reporting/dashboards',
  'automations', 'meters', 'assets', 'parts', 'maintenance-plans', 'library',
  'library/work-orders', 'library/procedures', 'library/safety-data-sheets',
  'categories', 'locations', 'vendors', 'chat', 'routines', 'history',
]

export const recordPageNames = {
  workorders: 'Work Orders',
  requests: 'Requests',
  messages: 'Messages',
  'purchase-orders': 'Purchase Orders',
  reporting: 'Reporting',
  'reporting/work-orders': 'Reporting / Work Orders',
  'reporting/asset-health': 'Reporting / Asset Health',
  'reporting/details': 'Reporting / Details',
  'reporting/activity': 'Reporting / Activity',
  'reporting/exports': 'Reporting / Exports',
  'reporting/dashboards': 'Reporting / Dashboards',
  automations: 'Automations',
  meters: 'Meters',
  assets: 'Assets',
  parts: 'Parts Inventory',
  'maintenance-plans': 'Maintenance Plans',
  library: 'Library',
  'library/work-orders': 'Library / Work Orders',
  'library/procedures': 'Library / Procedures',
  'library/safety-data-sheets': 'Library / Safety Data Sheets',
  categories: 'Categories',
  locations: 'Locations',
  vendors: 'Vendors',
  chat: 'Chat',
  routines: 'Routines',
  history: 'History',
}
