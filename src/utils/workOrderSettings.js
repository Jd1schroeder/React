export const DEFAULT_WORK_ORDER_SETTINGS = {
  externalWorkOrders: false,
  commentRequirements: { onHold: "mandatory", skipped: "mandatory", canceled: "mandatory" },
  filterByFailOrFlag: true,
  assignUsersTeamsOnMention: true,
  showToDoByStartDateOnly: false,
  useSmartTimeEstimates: false,
  enableCostTracking: true,
  requireCostTracking: false,
  enableTimeTracking: true,
  requireTimeTracking: false,
  enableParts: false,
  enableUnitCostOverrides: false,
  requireParts: false,
  correctiveActionsOnFailures: "automatic",
  correctiveActionsOnFlags: "automatic",
  anomalyDetection: true,
  enableWorkloadView: true,
  multipleAssignees: "split_evenly",
};

export function normalizeWorkOrderSettings(settings = {}) {
  const normalized = {
    ...DEFAULT_WORK_ORDER_SETTINGS,
    ...settings,
    commentRequirements: {
      ...DEFAULT_WORK_ORDER_SETTINGS.commentRequirements,
      ...(settings.commentRequirements ?? {}),
    },
  };
  if (!normalized.enableCostTracking) normalized.requireCostTracking = false;
  if (!normalized.enableTimeTracking) normalized.requireTimeTracking = false;
  if (!normalized.enableParts) {
    normalized.enableUnitCostOverrides = false;
    normalized.requireParts = false;
  }
  return normalized;
}
