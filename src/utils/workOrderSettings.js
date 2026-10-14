export const DEFAULT_WORK_ORDER_SETTINGS = {
  externalWorkOrders: false,
  externalWorkOrderLinkExpiration: "work_order_closed",
  externalWorkOrderAccess: {
    description: "view",
    due_date: "view",
    priority: "view",
    asset: "view",
    location: "view",
    custom_fields: "view",
    procedure: "interact",
    comments: "comment",
    attachments: "view",
    showInternalCommentAuthors: false,
    requireCommenterName: true,
    requireCommenterEmail: false,
  },
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
    externalWorkOrderAccess: {
      ...DEFAULT_WORK_ORDER_SETTINGS.externalWorkOrderAccess,
      ...(settings.externalWorkOrderAccess ?? {}),
    },
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
