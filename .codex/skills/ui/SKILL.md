---
name: ui
description: Build and refactor Workbench UI pages, navigation, panel layouts, responsive styling, and reusable visual components.
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
- Use the shared `--focus-border-width` and `--focus-border-color` tokens for focused form controls; the standard focused border is 2px blue without an added focus shadow.
- Use `--warning-soft` for pale warning surfaces; the current warning surface is `#FEF9EC`.

Every new sidebar destination should use the shared panel shell unless its interaction model genuinely differs. Keep page-specific differences in the page stylesheet, not in `App.css`.

The authenticated shell is gated by `WorkspaceProvider`. During session/workspace hydration, show the shared neutral loading surface and spinner; render the sidebar and page together only after authoritative workspace data is ready. Workspace failures must show the shared retry state instead of placeholder identity or organization values.

Unknown record IDs under a valid section route must preserve the parent `PanelView` and render the shared `PanelRecordNotFound` state in its detail pane. Unknown authenticated top-level routes must preserve `AppLayout` and render only the artwork in the main content area. Public splash and authentication routes remain outside the application shell.

Use Lucide icons already installed in the project. Keep icon sizing controlled by the component that owns the shared UI so changes propagate consistently.

Use `src/components/ui/Avatar.jsx` for every user avatar. Render the uploaded image when available; otherwise derive initials from first and last names, or only the first name when no last name exists, with `A` as the neutral fallback. Do not create page-specific avatar fallback logic.

Use `src/components/ui/Select.jsx` for standard dropdowns. It provides the shared styled trigger, rotating Lucide chevron, focus tokens, outside-click dismissal, keyboard navigation, and listbox semantics. Options may provide `disabled: true` and a Lucide `icon` for unavailable choices or explanatory affordances; disabled options remain muted and non-interactive. Keep specialized selectors, such as phone-country selection, separate only when they need custom option content.

## Sidebar reference tokens

- Group headings use `0.8571rem` font size and `1.2857rem` line-height.
- Navigation items use 32px height, 8px padding, and an 8px radius.
- Standard page content uses a 16px shell inset. Full-bleed `PanelView` pages may offset that inset with matching `-16px` margins, but their visible content must remain one 16px inset from the shell edge.
- Page headers must remain visible while the page scrolls: use the shared sticky treatment for `.page-heading`, `.panel-view-header`, and `.settings-page-header`, with an opaque surface background and stacking order below the sidebar menus.
- The settings navigation rail is fixed beside the details column on desktop and remains in-flow on narrow screens; reserve the details grid column when using the fixed rail.
- Icon-only edit controls use color-only hover feedback with `var(--icon-hover)` (`rgb(97 174 255)`); do not add a hover background behind the icon.
- Active items use `#E7F3FE` as the background, normal 400 weight, and `#1E2429` for the root text color; active icon and label treatments may apply the accent blue separately.
- When matching reference designs, compare computed styles and rendered fonts in addition to screenshots.
- The collapsed sidebar root uses `padding: 0`; section spacing belongs to `.sidebar-header` and `.sidebar-nav`, while `.sidebar-bottom` remains `padding: 0`.
- The collapsed sidebar width is `50px`, exposed as `--sidebar-collapsed-width`; preserve the legacy `--sidebarCollapsedWidth` alias when changing sidebar geometry.
- The expanded sidebar width is `246px`, exposed as `--sidebar-expanded-width` and the alias `--sidebarWidth`.
- Sidebar item icons are assigned through the `icon` property in the `groups` configuration in `src/components/layout/Sidebar.jsx`; use installed Lucide icons rather than duplicating navigation markup.
- Nested sidebar destinations must automatically open their parent group when the nested route is active, so deep-linked pages remain visible and selected in navigation.
- Sidebar expand/collapse uses a short 160ms width transition; preserve this when changing collapsed-state geometry.
- Sidebar navigation scrolling is owned by `.sidebar-nav`; keep `.sidebar-bottom` outside the scroll region. For scrollbar styling, scope `scrollbar-color` and `scrollbar-width` to non-WebKit browsers so Chromium `::-webkit-scrollbar` rules can remove native arrow buttons.
- The account area in `.settings-menu-root` owns the account popover and Supabase sign-out action; close it on outside pointer interaction and keep account identity sourced from `workspaceService.js`.
- Organization and personal settings use the shared route-backed `src/pages/SettingsPage.jsx`; Manage Teammates and Invite Users use the organization and invitation services for membership administration, generated invite links, and invitation revocation.
- Profile Preferences uses workspace identity from `src/services/workspaceService.js`; profile, phone, avatar, and localization controls persist through `src/services/profileService.js`.
- Tork destinations (`Chat`, `Routines`, and `History`) intentionally render only the Workbench 404 artwork inside the authenticated app shell until their UI is designed.

Validate visual refactors with `npm.cmd run lint` and `npm.cmd run build`.
