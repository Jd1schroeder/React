export const DEFAULT_FEATURE_LABELS = {
  workOrder: { singular: "Work Order", plural: "Work Orders" },
  asset: { singular: "Asset", plural: "Assets" },
  location: { singular: "Location", plural: "Locations" },
  request: { singular: "Request", plural: "Requests" },
  purchaseOrder: { singular: "Purchase Order", plural: "Purchase Orders" },
  part: { singular: "Part", plural: "Parts" },
  meter: { singular: "Meter", plural: "Meters" },
  team: { singular: "Team", plural: "Teams" },
  vendor: { singular: "Vendor", plural: "Vendors" },
  category: { singular: "Category", plural: "Categories" },
  reporting: { singular: "Reporting", plural: "Reporting" },
  requestPortal: { singular: "Request Portal", plural: "Request Portals" },
  workstation: { singular: "Workstation Mode", plural: "Workstation Mode" },
  workOrderTemplate: { singular: "Work Order Template", plural: "Work Order Templates" },
  automation: { singular: "Automation", plural: "Automations" },
  maintenancePlan: { singular: "Maintenance Plan", plural: "Maintenance Plans" },
};

export const FEATURE_LABEL_SECTIONS = [
  { key: "workOrder", label: "Work Order" },
  { key: "asset", label: "Asset" },
  { key: "location", label: "Location" },
  { key: "request", label: "Request" },
  { key: "purchaseOrder", label: "Purchase Order" },
  { key: "part", label: "Part" },
  { key: "meter", label: "Meter" },
  { key: "team", label: "Team" },
  { key: "vendor", label: "Vendor" },
  { key: "category", label: "Category" },
  { key: "reporting", label: "Reporting" },
  { key: "requestPortal", label: "Request Portal" },
  { key: "workstation", label: "Workstation Mode" },
  { key: "workOrderTemplate", label: "Work Order Template" },
  { key: "automation", label: "Automation" },
  { key: "maintenancePlan", label: "Maintenance Plan" },
];

const PAGE_LABEL_KEYS = {
  "Work Orders": "workOrder",
  Requests: "request",
  Assets: "asset",
  Locations: "location",
  "Purchase Orders": "purchaseOrder",
  Meters: "meter",
  Vendors: "vendor",
  "Parts Inventory": "part",
  "Maintenance Plans": "maintenancePlan",
  Automations: "automation",
  Reporting: "reporting",
};

export function normalizeFeatureLabels(labels = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_FEATURE_LABELS).map(([key, defaults]) => [
    key,
    {
      singular: typeof labels?.[key]?.singular === "string" && labels[key].singular.trim() ? labels[key].singular.trim() : defaults.singular,
      plural: typeof labels?.[key]?.plural === "string" && labels[key].plural.trim() ? labels[key].plural.trim() : defaults.plural,
    },
  ]));
}

export function getFeatureLabel(labels, key, form = "plural") {
  const defaults = DEFAULT_FEATURE_LABELS[key];
  if (!defaults) return "";
  const value = labels?.[key]?.[form];
  return typeof value === "string" && value.trim() ? value.trim() : defaults[form];
}

export function getFeatureLabelKey(pageName) {
  return PAGE_LABEL_KEYS[pageName] ?? null;
}
