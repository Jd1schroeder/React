import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const timeTrackingSource = readFileSync(resolve(globalThis.process.cwd(), "src/pages/work-orders/WorkOrderTimeTracking.jsx"), "utf8");
const detailStyles = readFileSync(resolve(globalThis.process.cwd(), "src/pages/work-orders/WorkOrderDetail.css"), "utf8");

describe("Time Overview header contract", () => {
  it("uses the shared Lucide back icon instead of a CSS-drawn arrow", () => {
    expect(timeTrackingSource).toContain("ArrowLeft");
    expect(timeTrackingSource).toContain("mobile-app-header is-page-header");
    expect(timeTrackingSource).toContain("mobile-app-header-back");
    expect(timeTrackingSource).toContain("ArrowLeft");
    expect(detailStyles).not.toMatch(/work-order-time-overview-header[^{}]*::before/);
  });
});

describe("User Times navigation contract", () => {
  it("opens User Times from both the My Time control and its duration", () => {
    expect(timeTrackingSource).toContain("isUserTimesOpen");
    expect(timeTrackingSource).toContain("User Times");
    expect(timeTrackingSource).toContain("setIsUserTimesOpen(true)");
    expect(timeTrackingSource).toContain("myEntries");
    expect(timeTrackingSource).toContain("work-order-time-overview-entry-duration-link");
    expect(timeTrackingSource).toContain("Change Time Category");
    expect(timeTrackingSource).toContain("Editing Time Entry");
    expect(timeTrackingSource).toContain("setUserTimeEditStep(\"details\")");
    expect(timeTrackingSource).toContain("work-order-time-overview-total-label");
    expect(timeTrackingSource).toContain('aria-label="Seconds"');
    expect(timeTrackingSource).toContain("entry.hourly_rate ?? 0");
    expect(timeTrackingSource).toContain("members.get(entry.user_id)");
    expect(timeTrackingSource).toContain("existing.seconds += entrySeconds");
    expect(timeTrackingSource).toContain('role="alertdialog"');
    expect(timeTrackingSource).toContain("delete-time-entry-title");
    expect(timeTrackingSource).toContain("confirmDeleteUserTimeEntry");
    expect(timeTrackingSource).toContain("openNewUserTimeEntry");
    expect(timeTrackingSource).toContain("title=\"Select User\"");
    expect(timeTrackingSource).toContain("title={editingEntry ? \"Change Time Category\" : \"Add Time Category\"}");
    expect(timeTrackingSource).toContain("selectNewTimeEntryUser");
    expect(timeTrackingSource).toContain("createWorkOrderTimeEntry({");
  });
});
