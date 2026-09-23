---
name: maintainx-ui-reference
description: Translate pasted MaintainX markup, computed styles, or screenshots into Workbench UI structure and styling while preserving Workbench components, tokens, and behavior.
---

# MaintainX UI Reference

Use this skill when the user provides MaintainX HTML, DOM output, computed CSS, screenshots, or a MaintainX interaction as a reference for Workbench.

## Translation rule

Copy the reference’s meaningful format:

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
- Represent unfinished reference controls with explicit opt-in props or feature boundaries. Do not render placeholder actions on every page just because they appear in the reference.
- For reference detail pages, preserve the meaningful two-column summary/actions and activity/permissions regions, but render unavailable data as explicit empty states or disabled controls until Workbench services exist. Do not copy reference records into the scaffold.
- Preserve the existing shell’s scroll ownership. Do not add nested page scrolling or fixed offsets merely to match a screenshot.

## Reference analysis

Separate observations into three layers before editing:

1. Structure: identify the meaningful container hierarchy and which regions are siblings.
2. Presentation: compare computed styles, spacing, typography, borders, and responsive rules.
3. Behavior: identify controls, selected states, scrolling, menus, and data-driven regions.

Prefer computed styles and the reference DOM over visual guesses when they conflict. Use the reference to establish relationships, then verify the Workbench result with the project’s own DOM and styles.

## Validation

After a structural or visual change, run `npm.cmd run verify` and inspect the rendered layout at the reference viewport. Confirm that:

- the intended nesting is present in Workbench-owned markup
- unrelated pages do not receive unfinished controls
- the correct element owns scrolling
- the implementation uses Workbench names and tokens rather than generated reference names
