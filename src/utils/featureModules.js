const FEATURE_MODULE_KEYS = [
  "tork",
  "requestPortal",
  "purchaseOrder",
  "part",
  "meter",
  "vendor",
  "workstation",
  "workOrderTemplate",
  "automation",
];

const PAGE_FEATURE_MODULE_KEYS = {
  Chat: "tork",
  Routines: "tork",
  History: "tork",
  "Request Portals": "requestPortal",
  "Purchase Orders": "purchaseOrder",
  "Parts Inventory": "part",
  Meters: "meter",
  Vendors: "vendor",
  "Workstation Mode": "workstation",
  "Work Order Template": "workOrderTemplate",
  Automations: "automation",
};

export function normalizeFeatureModules(modules = {}) {
  return Object.fromEntries(FEATURE_MODULE_KEYS.map((key) => [key, modules?.[key] !== false]));
}

export function getFeatureModuleKeyForPage(pageName) {
  return PAGE_FEATURE_MODULE_KEYS[pageName] ?? null;
}

export function isFeatureModuleEnabled(modules, moduleKey) {
  if (!moduleKey) return true;
  return normalizeFeatureModules(modules)[moduleKey] !== false;
}

export function isFeaturePageEnabled(modules, pageName) {
  return isFeatureModuleEnabled(modules, getFeatureModuleKeyForPage(pageName));
}
