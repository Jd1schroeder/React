import { describe, expect, it } from "vitest";
import { getFeatureModuleKeyForPage, isFeaturePageEnabled, normalizeFeatureModules } from "../src/utils/featureModules";

describe("feature modules", () => {
  it("defaults supported modules to enabled and preserves explicit disabled values", () => {
    expect(normalizeFeatureModules({ purchaseOrder: false })).toMatchObject({
      purchaseOrder: false,
      meter: true,
      automation: true,
    });
  });

  it("maps module routes to the organization feature switch", () => {
    expect(getFeatureModuleKeyForPage("Purchase Orders")).toBe("purchaseOrder");
    expect(getFeatureModuleKeyForPage("Chat")).toBe("tork");
    expect(isFeaturePageEnabled({ purchaseOrder: false }, "Purchase Orders")).toBe(false);
    expect(isFeaturePageEnabled({ tork: false }, "History")).toBe(false);
    expect(isFeaturePageEnabled({ purchaseOrder: false }, "Work Orders")).toBe(true);
  });
});
