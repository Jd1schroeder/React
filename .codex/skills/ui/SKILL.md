---
name: ui
description: Build Workbench pages and interactions using shared layout primitives, reusable controls, accessibility requirements, and design tokens.
---

# UI Skill

Load the matching implementation Pattern for detailed page recipes instead of treating this Skill as a feature-by-feature catalog.

Related Patterns: [panel page and route](../../patterns/frontend/panel-page-and-route.md), [application shell and settings](../../patterns/frontend/application-shell-and-settings.md), [categorized remote inbox](../../patterns/frontend/categorized-remote-inbox.md), [organization administration](../../patterns/frontend/organization-administration.md), [shared UI controls](../../patterns/frontend/shared-ui-controls.md).

Related Decisions: [001 — Frontend platform and routing](../../decisions/001-frontend-platform-and-routing.md), [002 — Client state and navigation](../../decisions/002-client-state-and-navigation.md), [005 — Organization roles and permissions](../../decisions/005-organization-roles-and-permissions.md), [009 — Work Order Inbox paging and review state](../../decisions/009-work-order-inbox-query-and-review-state.md).

## Core rules

- Extend existing components under `src/components/layout` and `src/components/ui` before creating parallel primitives. Compose route-level pages under `src/pages` and keep feature-specific styles with the feature.
- Use `PanelLayout` for the shared page header/search/action/subnavigation shell and `PanelView` for the established list/detail page. Consult the [panel page and route Pattern](../../patterns/frontend/panel-page-and-route.md) for routing and not-found behavior.
- Use shared UI controls and tokens from `src/styles/tokens.css`. Prefer semantic tokens; do not scatter raw colors or copy component behavior into pages. The document root is intentionally 14px.
- Preserve semantic, keyboard-operable controls and visible focus states. Respect `prefers-reduced-motion` for nonessential animation; keep loading states layout-stable.
- Use the saved workspace locale/timezone via `src/utils/dateFormatting.js`, not browser-locale formatting.
- Use Lucide icons already installed and size them in the component that owns the shared UI.
- When the user supplies reference markup, computed CSS, or a screenshot, load the [MaintainX UI reference Skill](../maintainx-ui-reference/SKILL.md); preserve literal element hierarchy when HTML is provided and distinguish external reference observations from established Workbench rules.
- Keep page behavior aligned with current source and relevant domain/API/security Skills. UI visibility is not authorization; follow the [permissioned feature boundary Pattern](../../patterns/security/permissioned-feature-boundary.md) for protected actions.

## Routing

Load the [panel page and route Pattern](../../patterns/frontend/panel-page-and-route.md) when adding pages or record routes. Route paths are built in `src/routes.js`; lazy route registration is in `src/routes/routeConfig.jsx`.

## Feature patterns

- Categorized remote records: [categorized remote inbox](../../patterns/frontend/categorized-remote-inbox.md).
- Organization, member, role, and invitation screens: [organization administration](../../patterns/frontend/organization-administration.md).
- Sidebar, authenticated shell, and settings pages: [application shell and settings](../../patterns/frontend/application-shell-and-settings.md).
- Forms, selectors, tables, and images: [shared UI controls](../../patterns/frontend/shared-ui-controls.md).

## Validation

Run `npm.cmd run verify` for UI changes. For meaningful layout or interaction changes, also inspect the rendered state at the affected viewport and test keyboard/reduced-motion behavior where applicable.
