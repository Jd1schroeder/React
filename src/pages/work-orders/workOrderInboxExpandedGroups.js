const groupIdsByTab = {
  "To Do": ["assigned-to-me", "assigned-to-my-teams", "created-by-me", "all-open"],
  Done: ["completed"],
};

export function getWorkOrderInboxExpandedGroupsKey({ userId, organizationId, activeTab }) {
  if (!userId || !organizationId) return null;

  const tabKey = activeTab === "Done" ? "done" : "todo";
  return `workbench.workOrderInbox.expandedGroups.v1:${encodeURIComponent(userId)}:${encodeURIComponent(organizationId)}:${tabKey}`;
}

export function readWorkOrderInboxExpandedGroups(storageKey, activeTab) {
  if (!storageKey || typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return {};

    const groupIds = JSON.parse(stored);
    if (!Array.isArray(groupIds)) return {};

    const allowedGroupIds = new Set(groupIdsByTab[activeTab] ?? []);
    return Object.fromEntries(
      [...new Set(groupIds)].filter(
        (groupId) => typeof groupId === "string" && allowedGroupIds.has(groupId),
      ).map((groupId) => [groupId, true]),
    );
  } catch {
    return {};
  }
}

export function writeWorkOrderInboxExpandedGroups(storageKey, activeTab, expandedGroups) {
  if (!storageKey || typeof window === "undefined") return;

  const allowedGroupIds = groupIdsByTab[activeTab] ?? [];
  const expandedGroupIds = allowedGroupIds.filter((groupId) => expandedGroups[groupId]);

  try {
    if (expandedGroupIds.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(expandedGroupIds));
  } catch {
    // Storage can be unavailable or full; list interaction should still work.
  }
}
