import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const serviceMocks = vi.hoisted(() => ({
  getWorkOrderById: vi.fn(),
  listWorkOrderInboxCounts: vi.fn(),
  getWorkOrderInboxPreferences: vi.fn(),
  listOrganizationMembers: vi.fn(),
  listOrganizationTeams: vi.fn(),
  listOrganizationTeamMemberships: vi.fn(),
  markWorkOrderRead: vi.fn(),
  workspace: {
    organization: { id: "org-1" },
    authorization: { status: "ready", grants: { "work_orders.view": "organization" } },
    teamIds: [],
    user: { id: "user-1" },
    preferences: { date_format: "MM/dd/yyyy", timezone: "UTC" },
  },
}));

vi.mock("../src/components/layout/useWorkspace", () => ({
  useWorkspace: () => serviceMocks.workspace,
}));

vi.mock("../src/components/layout/PanelLayout", () => ({
  PanelLayout: ({ children }) => <main>{children}</main>,
}));

vi.mock("../src/components/layout/useUnsavedChanges", () => ({
  useUnsavedChanges: () => ({
    guardNavigation: (callback) => callback(),
    setHasUnsavedChanges: vi.fn(),
  }),
}));

vi.mock("../src/pages/work-orders/WorkOrderList", () => ({
  WorkOrderFilters: () => null,
  WorkOrderList: ({ activeTab, filters }) => <section aria-label="Work Order list"><span data-testid="active-work-order-tab">{activeTab}</span><span data-testid="active-work-order-filters">{JSON.stringify(filters)}</span></section>,
}));

vi.mock("../src/services/workOrderService", () => ({
  createWorkOrder: vi.fn(),
  getWorkOrderById: serviceMocks.getWorkOrderById,
  listWorkOrderInboxCounts: serviceMocks.listWorkOrderInboxCounts,
  listWorkOrderInboxPage: vi.fn(),
  markWorkOrderInboxRead: vi.fn(),
  markWorkOrderRead: serviceMocks.markWorkOrderRead,
  markWorkOrderUnread: vi.fn(),
  signWorkOrderAttachmentUrls: vi.fn(),
  updateWorkOrderDetails: vi.fn(),
  updateWorkOrderExecution: vi.fn(),
}));

vi.mock("../src/services/organizationService", () => ({
  listOrganizationMembers: serviceMocks.listOrganizationMembers,
  listOrganizationTeams: serviceMocks.listOrganizationTeams,
  listOrganizationTeamMemberships: serviceMocks.listOrganizationTeamMemberships,
}));

vi.mock("../src/services/workOrderInboxPreferenceService", () => ({
  getWorkOrderInboxPreferences: serviceMocks.getWorkOrderInboxPreferences,
  saveWorkOrderInboxPreferences: vi.fn(),
}));

import { WorkOrders } from "../src/pages/WorkOrders";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  serviceMocks.listWorkOrderInboxCounts.mockResolvedValue({});
  serviceMocks.getWorkOrderInboxPreferences.mockResolvedValue({ sortId: "priority-highest", unreadFirst: false });
  serviceMocks.listOrganizationMembers.mockResolvedValue([]);
  serviceMocks.listOrganizationTeams.mockResolvedValue([]);
  serviceMocks.listOrganizationTeamMemberships.mockResolvedValue([]);
});

function renderDeepLinkedWorkOrder() {
  return render(<MemoryRouter initialEntries={["/workorders/wo-1"]}><WorkOrders recordId="wo-1" /></MemoryRouter>);
}

function renderCompletedDashboardFilter() {
  return render(<MemoryRouter initialEntries={["/workorders?dashboardFilter=completed"]}><WorkOrders /></MemoryRouter>);
}

describe("Work Orders deep-link refresh", () => {
  it("keeps the detail pane loading until lookup confirms a missing record", async () => {
    let resolveLookup;
    serviceMocks.getWorkOrderById.mockReturnValue(new Promise((resolve) => { resolveLookup = resolve; }));
    renderDeepLinkedWorkOrder();

    expect(serviceMocks.getWorkOrderById).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Loading Work Order...");
    expect(screen.queryByAltText("Workbench 404 illustration")).not.toBeInTheDocument();

    await act(async () => resolveLookup(null));
    await waitFor(() => expect(screen.getByAltText("Workbench 404 illustration")).toBeInTheDocument());
  });

  it("opens the Done tab with completed Work Orders when launched from the Dashboard sheet", async () => {
    renderCompletedDashboardFilter();

    expect(await screen.findByTestId("active-work-order-tab")).toHaveTextContent("Done");
    expect(screen.getByTestId("active-work-order-filters")).toHaveTextContent('"field":"status"');
    expect(screen.getByTestId("active-work-order-filters")).toHaveTextContent('"values":["Completed"]');
  });
});
