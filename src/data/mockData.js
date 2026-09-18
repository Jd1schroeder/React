export const workOrders = [
  { id: 'WO-1048', title: 'Replace air filter', asset: 'HVAC Unit 04', location: 'Building A', status: 'Open', priority: 'High', assignee: 'JD', requester: 'Jordan Davis', assignedTeam: 'Maintenance team', workType: 'Corrective maintenance', created: 'September 16, 2026', due: 'Today', description: 'Inspect the equipment, document the issue, and add any parts or follow-up work needed to complete this request.', attachments: 0 },
  { id: 'WO-1047', title: 'Inspect loading dock door', asset: 'Dock Door 02', location: 'Warehouse', status: 'In Progress', priority: 'Medium', assignee: 'MK', requester: 'Maria Kim', assignedTeam: 'Maintenance team', workType: 'Corrective maintenance', created: 'September 16, 2026', due: 'Tomorrow', description: 'Inspect the equipment, document the issue, and add any parts or follow-up work needed to complete this request.', attachments: 0 },
  { id: 'WO-1046', title: 'Repair break room sink', asset: 'Sink 01', location: 'Building B', status: 'Open', priority: 'Low', assignee: 'AR', requester: 'Alex Rivera', assignedTeam: 'Maintenance team', workType: 'Corrective maintenance', created: 'September 16, 2026', due: 'Sep 20', description: 'Inspect the equipment, document the issue, and add any parts or follow-up work needed to complete this request.', attachments: 0 },
  { id: 'WO-1045', title: 'Quarterly fire extinguisher check', asset: 'Safety Equipment', location: 'All locations', status: 'Completed', priority: 'Medium', assignee: 'JD', requester: 'Jordan Davis', assignedTeam: 'Maintenance team', workType: 'Preventive maintenance', created: 'September 16, 2026', due: 'Sep 16', description: 'Inspect the equipment, document the issue, and add any parts or follow-up work needed to complete this request.', attachments: 0 },
  { id: 'WO-1044', title: 'Calibrate packaging scale', asset: 'Scale 03', location: 'Production', status: 'On Hold', priority: 'High', assignee: 'LS', requester: 'Lee Smith', assignedTeam: 'Maintenance team', workType: 'Corrective maintenance', created: 'September 16, 2026', due: 'Sep 22', description: 'Inspect the equipment, document the issue, and add any parts or follow-up work needed to complete this request.', attachments: 0 },
]

export const workOrderCounts = { todo: 24, done: 87 }

export const assets = [
  { id: 'AST-1001', name: 'HVAC Unit 04', category: 'HVAC', location: 'Building A · Floor 2', health: 'Good', openWorkOrders: 1 },
  { id: 'AST-1002', name: 'Dock Door 02', category: 'Material Handling', location: 'Warehouse · East', health: 'Needs attention', openWorkOrders: 2 },
  { id: 'AST-1003', name: 'Packaging Scale 03', category: 'Production', location: 'Production · Line 1', health: 'Good', openWorkOrders: 0 },
  { id: 'AST-1004', name: 'Forklift 07', category: 'Vehicles', location: 'Warehouse · North', health: 'Good', openWorkOrders: 0 },
]

export const parts = [
  { id: 'PART-2001', name: 'MERV 13 air filter', category: 'HVAC', location: 'Maintenance shop', quantity: 12, reorderPoint: 4 },
  { id: 'PART-2002', name: 'Dock door roller', category: 'Material handling', location: 'Warehouse stockroom', quantity: 6, reorderPoint: 2 },
  { id: 'PART-2003', name: '3/4 inch ball valve', category: 'Plumbing', location: 'Maintenance shop', quantity: 3, reorderPoint: 5 },
]

export const pmSchedules = [
  { name: 'Monthly HVAC inspection', asset: 'HVAC Unit 04', frequency: 'Monthly', nextDue: 'Sep 22', status: 'On track' },
  { name: 'Weekly forklift safety check', asset: 'Forklift 07', frequency: 'Weekly', nextDue: 'Sep 19', status: 'On track' },
  { name: 'Quarterly scale calibration', asset: 'Packaging Scale 03', frequency: 'Quarterly', nextDue: 'Oct 01', status: 'Due soon' },
]

export const scaffoldPages = {
  Requests: { action: 'Create request', stats: [['New requests', '8'], ['Awaiting review', '3'], ['Resolved this month', '41']] },
  Messages: { action: 'Start conversation', stats: [['Unread', '4'], ['Active conversations', '12'], ['Team members', '18']] },
  'Purchase Orders': { action: 'Create purchase order', stats: [['Open orders', '4'], ['Awaiting approval', '2'], ['Received this month', '18']] },
  Reporting: { action: 'Create report', stats: [['Reports', '6'], ['Scheduled', '2'], ['Data freshness', 'Live']] },
  'Reporting / Work Orders': { action: 'Create report', stats: [['Work order reports', '8'], ['Scheduled', '3'], ['Exports this month', '24']] },
  'Reporting / Asset Health': { action: 'Create report', stats: [['Assets monitored', '142'], ['Needs attention', '7'], ['Healthy assets', '135']] },
  'Reporting / Details': { action: 'Create report', stats: [['Report details', '18'], ['Configured fields', '64'], ['Last updated', 'Today']] },
  'Reporting / Activity': { action: 'Export activity', stats: [['Events today', '38'], ['Active users', '12'], ['Recent changes', '96']] },
  'Reporting / Exports': { action: 'Export data', stats: [['Available exports', '12'], ['Scheduled exports', '3'], ['Latest export', 'Today']] },
  'Reporting / Dashboards': { action: 'Create dashboard', stats: [['Dashboards', '4'], ['Shared with team', '3'], ['Favorites', '2']] },
  Automations: { action: 'Create automation', stats: [['Active rules', '5'], ['Runs this month', '128'], ['Time saved', '14h']] },
  'Parts Inventory': { action: 'Add part', stats: [['Parts tracked', '142'], ['Low stock', '7'], ['Inventory value', '$18.4k']] },
  'Maintenance Plans': { action: 'Create plan', stats: [['Active plans', '12'], ['Due this week', '4'], ['Completed this month', '32']] },
  Library: { action: 'Add library item', stats: [['Library items', '28'], ['Published', '22'], ['Drafts', '6']] },
  'Library / Work Orders': { action: 'Add template', stats: [['Templates', '16'], ['Published', '12'], ['Drafts', '4']] },
  'Library / Procedures': { action: 'Add procedure', stats: [['Procedures', '24'], ['Published', '19'], ['Needs review', '5']] },
  'Library / Safety Data Sheets': { action: 'Add safety data sheet', stats: [['Safety data sheets', '18'], ['Current', '16'], ['Needs review', '2']] },
  Categories: { action: 'Add category', stats: [['Categories', '14'], ['Used this month', '11'], ['Uncategorized', '6']] },
  Locations: { action: 'Add location', stats: [['Locations', '12'], ['Buildings', '4'], ['Unassigned assets', '3']] },
  'Teams / Users': { action: 'Invite user', stats: [['Team members', '18'], ['Teams', '4'], ['Pending invites', '2']] },
  Vendors: { action: 'Add vendor', stats: [['Vendors', '26'], ['Active vendors', '21'], ['Pending review', '3']] },
}
