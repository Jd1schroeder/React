import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PriorityBadge } from "../src/components/ui/PriorityBadge";

afterEach(cleanup);

describe("PriorityBadge", () => {
  it.each([
    ["Low", "low", "lucide-circle-arrow-down"],
    ["Medium", "medium", "lucide-circle-minus"],
    ["High", "high", "lucide-circle-arrow-up"],
    ["Urgent", "urgent", "lucide-circle-arrow-up"],
  ])("renders %s with the shared MaintainX badge structure", (priority, tone, iconClass) => {
    const { container } = render(<PriorityBadge priority={priority} />);
    const badge = container.querySelector(".priority-badge");

    expect(badge.tagName).toBe("DIV");
    expect(badge).toHaveClass("priority-badge-regular", `priority-badge-${tone}`);
    expect(badge.firstElementChild.tagName).toBe("SPAN");
    expect(badge.firstElementChild).toHaveClass("priority-badge-icon");
    expect(badge.firstElementChild.firstElementChild).toHaveClass(iconClass);
    expect(badge.lastChild.nodeType).toBe(Node.TEXT_NODE);
    expect(badge.lastChild.textContent).toBe(priority);
  });

  it.each([null, "None", "none"])("renders no badge when priority is %s", (priority) => {
    const { container } = render(<PriorityBadge priority={priority} />);

    expect(container.querySelector(".priority-badge")).not.toBeInTheDocument();
  });
});
