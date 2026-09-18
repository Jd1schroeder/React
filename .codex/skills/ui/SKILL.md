---
name: ui
description: Build and refactor Maintainly UI pages, navigation, panel layouts, responsive styling, and reusable visual components.
---

# UI Skill

Use the existing layout primitives before creating page-specific alternatives.

## Established structure

- `src/components/layout/Sidebar.jsx` and `Sidebar.css` own navigation and sidebar styling.
- `PanelLayout` owns the page header, search, primary action, and subnavigation.
- `PanelView` owns the reusable split list/detail panel.
- `src/pages/WorkOrders.css` contains Work Orders-only pane/detail styling.
- `src/styles/tokens.css` contains shared design tokens; prefer tokens over new hardcoded values.
- `src/styles/globals.css` contains reset and document-level styles.
- Login and signup use the shared `AuthPage` implementation in `src/pages/AuthPage.jsx`; keep authentication modes as configuration rather than duplicating the full auth layout.
- The public splash page is the `/` entry route. Branding on unauthenticated pages may return to `Splash`, while the logged-in sidebar brand is static and must not navigate out of the application shell.
- Keep the left visual column of the splash and signup layouts aligned through the shared `--auth-visual-column` token in `src/styles/tokens.css`.

Every new sidebar destination should use the shared panel shell unless its interaction model genuinely differs. Keep page-specific differences in the page stylesheet, not in `App.css`.

Use Lucide icons already installed in the project. Keep icon sizing controlled by the component that owns the shared UI so changes propagate consistently.

## Sidebar reference tokens

- Group headings use `0.8571rem` font size and `1.2857rem` line-height.
- Navigation items use 32px height, 8px padding, and an 8px radius.
- Active items use `#E7F3FE` as the background, normal 400 weight, and `#1E2429` for the root text color; active icon and label treatments may apply the accent blue separately.
- When matching MaintainX, compare computed styles and rendered fonts in addition to screenshots.
- The collapsed sidebar root uses `padding: 0`; section spacing belongs to `.sidebar-header` and `.sidebar-nav`, while `.sidebar-bottom` remains `padding: 0`.
- The collapsed sidebar width is `50px`, exposed as `--sidebar-collapsed-width` and the MaintainX-compatible alias `--sidebarCollapsedWidth`.
- The expanded sidebar width is `246px`, exposed as `--sidebar-expanded-width` and the alias `--sidebarWidth`.
- Sidebar item icons are assigned through the `icon` property in the `groups` configuration in `src/components/layout/Sidebar.jsx`; use installed Lucide icons rather than duplicating navigation markup.
- Nested sidebar destinations must automatically open their parent group when the nested route is active, so deep-linked pages remain visible and selected in navigation.
- Sidebar expand/collapse uses a short 160ms width transition; preserve this when changing collapsed-state geometry.
- Sidebar navigation scrolling is owned by `.sidebar-nav`; keep `.sidebar-bottom` outside the scroll region. For scrollbar styling, scope `scrollbar-color` and `scrollbar-width` to non-WebKit browsers so Chromium `::-webkit-scrollbar` rules can remove native arrow buttons.

Validate visual refactors with `npm.cmd run lint` and `npm.cmd run build`.
