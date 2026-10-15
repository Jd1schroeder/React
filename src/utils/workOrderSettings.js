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
  requiredSchedule: "none",
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

export const WORK_ORDER_SCHEDULE_REQUIREMENT_OPTIONS = [
  { value: "none", label: "No required date" },
  { value: "due_date", label: "Require due date" },
  { value: "start_date", label: "Require start date" },
  { value: "both", label: "Require both dates" },
];

export function normalizeWorkOrderScheduleRequirement(value) {
  return WORK_ORDER_SCHEDULE_REQUIREMENT_OPTIONS.some((option) => option.value === value)
    ? value
    : DEFAULT_WORK_ORDER_SETTINGS.requiredSchedule;
}

export function getWorkOrderScheduleRequirementError(requirement, { dueDate, startDate } = {}) {
  const normalizedRequirement = normalizeWorkOrderScheduleRequirement(requirement);
  const missingDueDate = ["due_date", "both"].includes(normalizedRequirement) && !dueDate;
  const missingStartDate = ["start_date", "both"].includes(normalizedRequirement) && !startDate;

  if (missingDueDate && missingStartDate) return "A due date and start date are required by your organization's Work Order settings.";
  if (missingDueDate) return "A due date is required by your organization's Work Order settings.";
  if (missingStartDate) return "A start date is required by your organization's Work Order settings.";
  return "";
}

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
  normalized.requiredSchedule = normalizeWorkOrderScheduleRequirement(normalized.requiredSchedule);
  if (!normalized.enableCostTracking) normalized.requireCostTracking = false;
  if (!normalized.enableTimeTracking) normalized.requireTimeTracking = false;
  if (!normalized.enableParts) {
    normalized.enableUnitCostOverrides = false;
    normalized.requireParts = false;
  }
  return normalized;
}
