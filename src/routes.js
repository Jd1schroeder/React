export const pagePaths = {
  Splash: '/',
  Login: '/login',
  Signup: '/signup',
  'Verify Email': '/verify-email',
  'Forgot Password': '/forgot-password',
  'Accept Invite': '/accept-invite',
  'Settings / General': '/settings/general',
  'Settings / Features': '/settings/features',
  'Settings / Subscription': '/settings/subscription',
  'Settings / Manage Teammates': '/settings/manage-teammates',
  'Settings / Customizations': '/settings/customizations',
  'Settings / Integrations': '/settings/integrations',
  'Settings / Profile Preferences': '/settings/profile-preferences',
  'Settings / Notification Settings': '/settings/notification-settings',
  'Settings / Invite Users': '/settings/invite-users',
  Dashboard: '/dashboard',
  'Work Orders': '/workorders',
  Requests: '/requests',
  Messages: '/messages',
  'Purchase Orders': '/purchase-orders',
  Chat: '/chat',
  Routines: '/routines',
  History: '/history',
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
  Users: '/users',
  Teams: '/teams',
  Vendors: '/vendors',
};

export function getPagePath(page) {
  return pagePaths[page] ?? '/workorders';
}

export function getRecordPath(type, id) {
  return `/${type}/${encodeURIComponent(id)}`;
}
