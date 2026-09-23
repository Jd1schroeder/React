import {
  BarChart3, Boxes, ClipboardCheck, FileText, History as HistoryIcon,
  Library as LibraryIcon, MapPin, MessageSquare, MessagesSquare, Package,
  RefreshCw, Repeat2, Settings, Tags, Users, Wrench, Zap,
} from 'lucide-react'

export const settingsPageByLabel = {
  General: 'Settings / General', Features: 'Settings / Features', Subscription: 'Settings / Subscription',
  'Manage Teammates': 'Settings / Manage Teammates', Customizations: 'Settings / Customizations', Integrations: 'Settings / Integrations',
  'Profile Preferences': 'Settings / Profile Preferences', 'Notification Settings': 'Settings / Notification Settings', 'Invite Users': 'Settings / Invite Users',
}

export const settingsNavigation = {
  organization: ['General', 'Features', 'Subscription', 'Manage Teammates', 'Customizations', 'Integrations'],
  personal: ['Profile Preferences', 'Notification Settings', 'Invite Users'],
}

export const sidebarGroups = [
  { label: 'Work', items: [
    { label: 'Work Orders', icon: ClipboardCheck, page: 'Work Orders', count: 24 },
    { label: 'Requests', icon: MessageSquare, page: 'Requests', count: 1 },
    { label: 'Purchase Orders', icon: FileText, page: 'Purchase Orders', count: 4 },
    { label: 'Messages', icon: MessagesSquare, page: 'Messages' },
  ] },
  { label: 'Tork', items: [
    { label: 'Chat', icon: MessageSquare, page: 'Chat' },
    { label: 'Routines', icon: Repeat2, page: 'Routines' },
    { label: 'History', icon: HistoryIcon, page: 'History' },
  ] },
  { label: 'Optimize', items: [
    { label: 'Reporting', icon: BarChart3, page: 'Reporting', children: [
      { label: 'Work Orders', page: 'Reporting / Work Orders' }, { label: 'Asset Health', page: 'Reporting / Asset Health' },
      { label: 'Reporting Details', page: 'Reporting / Details' }, { label: 'Recent Activity', page: 'Reporting / Activity' },
      { label: 'Export Data', page: 'Reporting / Exports' }, { label: 'Dashboards', page: 'Reporting / Dashboards' },
    ] },
    { label: 'Automations', icon: Zap, page: 'Automations' }, { label: 'Meters', icon: Wrench, page: 'Meters' },
  ] },
  { label: 'Manage', items: [
    { label: 'Assets', icon: Boxes, page: 'Assets' }, { label: 'Parts Inventory', icon: Settings, page: 'Parts Inventory' },
    { label: 'Maintenance Plans', icon: RefreshCw, page: 'Maintenance Plans' },
    { label: 'Library', icon: LibraryIcon, page: 'Library', children: [
      { label: 'Work Orders', page: 'Library / Work Orders' }, { label: 'Procedures', page: 'Library / Procedures' },
      { label: 'Safety Data Sheets', page: 'Library / Safety Data Sheets' },
    ] },
    { label: 'Categories', icon: Tags, page: 'Categories' }, { label: 'Locations', icon: MapPin, page: 'Locations' },
    { label: 'Teams / Users', icon: Users, page: 'Users' }, { label: 'Vendors', icon: Package, page: 'Vendors' },
  ] },
]
