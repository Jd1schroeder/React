---
name: maintainx-ui-reference
description: Translate pasted MaintainX markup, computed styles, or screenshots into Workbench UI structure and styling while preserving Workbench components, tokens, and behavior.
---

# MaintainX UI Reference

Related Patterns: [panel page and route](../../patterns/frontend/panel-page-and-route.md), [categorized remote inbox](../../patterns/frontend/categorized-remote-inbox.md), [organization administration pages](../../patterns/frontend/organization-administration.md), [shared UI controls](../../patterns/frontend/shared-ui-controls.md).

Related Decisions: [001](../../decisions/001-frontend-platform-and-routing.md), [005](../../decisions/005-organization-roles-and-permissions.md), [008](../../decisions/008-work-order-creation-and-persistence.md).

Use this skill when the user provides MaintainX HTML, DOM output, computed CSS, screenshots, or a MaintainX interaction as a reference for Workbench.

## Translation rule

Copy the reference’s meaningful format:

- When HTML is provided, preserve its element-by-element hierarchy and element types (for example, `button > span > p`), including wrapper elements. Replace reference-specific class names with Workbench-owned classes, but do not flatten or change the structure unless the user explicitly asks or an accessibility requirement requires it.
- DOM nesting and the relationship between navigation, alerts, subnavigation, main panels, content sections, lists, and details
- layout behavior, spacing relationships, sizing, alignment, scroll ownership, responsive behavior, and visible states
- semantic roles and interaction boundaries when they clarify the intended UI

Do not copy MaintainX implementation details:

- generated CSS-module class names or variable names
- proprietary data attributes, IDs, service URLs, or inline asset URLs
- private component names, internal state names, or copied source code
- MaintainX branding, data, or assets unless the user explicitly provides an asset for Workbench use

## Workbench implementation

Use Workbench primitives and conventions first. Extend shared components when the reference reveals a reusable boundary; keep page-specific differences in the page stylesheet.

- Use `PanelLayout` for the shared pane hierarchy.
- Keep the hierarchy explicit: `Navigation → Alert → SubNavigation → MainPanel → ContentSection`.
- Use Workbench tokens, Lucide icons, existing buttons, inputs, selects, avatars, and panel components instead of reproducing reference markup literally.
- When approximating a reference icon, retain the Workbench Lucide icon and tune its scoped CSS (such as dimensions, stroke, spacing, or transform) to match; replace the icon artwork only when the user explicitly asks for that.
- Represent unfinished reference controls with explicit opt-in props or feature boundaries. Do not render placeholder actions on every page just because they appear in the reference.
- For reference detail pages, preserve the meaningful two-column summary/actions and activity/permissions regions, but render unavailable data as explicit empty states or disabled controls until Workbench services exist. Do not copy reference records into the scaffold.
- Preserve the existing shell’s scroll ownership. Do not add nested page scrolling or fixed offsets merely to match a screenshot.

## Reference analysis

Separate observations into three layers before editing:

1. Structure: identify the meaningful container hierarchy and which regions are siblings.
2. Presentation: compare computed styles, spacing, typography, borders, and responsive rules.
3. Behavior: identify controls, selected states, scrolling, menus, and data-driven regions.

Prefer computed styles and the reference DOM over visual guesses when they conflict. Use the reference to establish relationships, then verify the Workbench result with the project’s own DOM and styles.

## Conformance workflow

Complete this comparison before changing reference-driven UI:

- Read the complete supplied HTML, computed CSS, and screenshots. Do not style from a cropped screenshot or isolated property list while ignoring the supplied DOM.
- Map the relevant reference elements and parent/child/sibling relationships to the Workbench JSX. Note which element owns each supplied layout property and which visible control it positions.
- Distinguish measured computed dimensions from intended layout constraints. Do not turn a measured width into a fixed CSS width unless the reference or responsive behavior supports that choice.
- Inspect the current Workbench DOM and scoped CSS, identify the exact layout owner causing the mismatch, and make the smallest change at that owner. Avoid compensating overrides on descendants or unrelated controls.

After changing the UI:

- Compare the rendered Workbench result with the reference at the same viewport, checking the actual alignment, spacing, sizing, and visible states. Passing tests or a production build does not establish visual conformance.
- If a browser or rendered capture is unavailable, state that visual conformance remains unverified; do not claim the UI matches or that the issue is fixed.
- If the user reports that the result is still wrong, stop making incremental CSS guesses. Re-read the supplied reference and inspect the current Workbench markup/styles, explain the specific mismatch, then adjust the responsible layout owner and verify again.

## Validation

After a structural or visual change, run `npm.cmd run verify` and inspect the rendered layout at the reference viewport. Confirm that:

- the intended nesting is present in Workbench-owned markup
- unrelated pages do not receive unfinished controls
- the correct element owns scrolling
- the implementation uses Workbench names and tokens rather than generated reference names
