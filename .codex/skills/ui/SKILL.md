---
name: ui
description: Build and refactor Workbench UI pages, navigation, panel layouts, responsive styling, and reusable visual components.
---

# UI Skill

Use the existing layout primitives before creating page-specific alternatives.

## Established structure

- `src/components/layout/Sidebar.jsx` and `Sidebar.css` own navigation and sidebar styling.
- Static sidebar groups and settings menu labels belong in `src/components/layout/sidebarConfig.js`; keep Supabase actions, open/close state, and rendering in `Sidebar.jsx`.
- `PanelLayout` owns the page header, search, primary action, and subnavigation.
- `PanelLayout` follows the reusable pane nesting `Navigation → Alert → SubNavigation → MainPanel → ContentSection`; page-specific list/detail content belongs inside `ContentSection`.
- `PanelView` owns the reusable split list/detail panel.
- `src/pages/WorkOrders.css` contains Work Orders-only pane/detail styling.
- Work Orders page orchestration belongs in `WorkOrders.jsx`; list/filter controls and detail content belong in `src/pages/work-orders/WorkOrderList.jsx` and `WorkOrderDetail.jsx`.
- Work Orders read and execution mutations use `src/services/workOrderService.js`; keep the page free of mock records. Database authorization controls core edits separately from assigned execution updates.
- `src/styles/tokens.css` contains shared design tokens; prefer tokens over new hardcoded values.
- The document root uses `--font-size-root` at 14px, so `1rem` equals 14px throughout the Workbench UI. Keep the root scale explicit rather than relying on the browser default.
- Use the standard Workbench type, line-height, spacing, border, radius, transition, elevation, and color tokens in `src/styles/tokens.css`. UI styles outside the token file must not contain raw color literals; use an existing semantic token or add a centralized palette/semantic token first. Migrate repeated values to tokens before introducing new literals. Keep unique brand artwork values centralized in the token file rather than scattering them through component CSS. Native `@media` breakpoints may remain literal because CSS custom properties are not reliably supported in media queries.
- Name color tokens by UI role (`--surface-*`, `--text-*`, `--border-*`, `--status-*`, `--auth-*`, or feature-specific names such as `--tooltip-surface`), not by encoded hex/RGB values. Keep feature artwork values centralized and explicitly scoped when they cannot be given a shared semantic role.
- `src/styles/globals.css` contains reset and document-level styles.
- Login and signup use the shared `AuthPage` implementation in `src/pages/AuthPage.jsx`; keep authentication modes as configuration rather than duplicating the full auth layout.
- The public splash page is the `/` entry route. Branding on unauthenticated pages may return to `Splash`, while the logged-in sidebar brand is static and must not navigate out of the application shell.
- Keep the left visual column of the splash and signup layouts aligned through the shared `--auth-visual-column` token in `src/styles/tokens.css`.
- Use the shared `--focus-border-width` and `--focus-border-color` tokens for focused form controls; the standard focused border is 2px blue without an added focus shadow.
- Use `--warning-soft` for pale warning surfaces; the current warning surface is `#FEF9EC`.

Every new sidebar destination should use the shared panel shell unless its interaction model genuinely differs. Keep page-specific differences in the page stylesheet, not in `App.css`.

People management uses dedicated `/users` and `/teams` pages with a shared Users/Teams tab switcher; the sidebar label remains “Teams / Users” but lands on `/users`.

Teammate administration uses `/settings/teammates/users`, `/settings/teammates/teams`, and `/settings/teammates/roles` as subpages within the Manage Teammates settings area. Show the built-in organization roles Requester, Technician, Supervisor, and Organization Admin separately from persisted custom roles; do not present application-level Superadmin as an organization role. Custom roles use the real granular permission catalog and must not render fabricated permission toggles.

Manage Teammates subpages use a consistent header action pattern: place the standard tokenized search field with a clear `X` beside the primary action, filter loaded records when a data model exists, and preserve the search affordance on scaffolded pages until persistence is connected.

User role assignment uses persisted `organization_members.role_id` values and the organization role list; do not use the legacy text role as the selector value. Custom-role deletion must require a replacement role in a reassignment modal.

Every module or feature must own a permission catalog before its authorization UI is built. A user has one effective organization role. Custom roles use a "Create from" baseline and copy its permissions at creation time. Deleting a role with assigned users must use a reassignment modal and must not complete until every affected user has a replacement role. Superadmin is platform-only and must never appear in organization-facing UI.

The current cross-module catalog and built-in-role baselines live in `src/services/permissionCatalog.js`; extend that catalog when adding a feature instead of inventing permission keys inside a page component. Use granular action keys, including nested feature actions, and render organization-wide actions as allow/deny rather than a misleading record scope.

For Work Orders, Technician permissions distinguish core editing from execution: technicians may change execution state on work orders assigned to them, including status and procedure progress, but may not edit core details on work orders they did not create.

User rows navigate to `/users/profile/:userId`, whose detail scaffold uses real organization-member/profile data for identity fields. Keep activity, work-order history, permissions, teams, and unavailable account actions as explicit empty or disabled states until their data models and services exist; never fill the profile scaffold with mock records.

The user profile permission panel renders the complete MaintainX-style catalog grouped by module, using enabled and disabled status icons; do not render only the permissions currently granted because the panel is an audit view.

Use the React Router route boundaries in `src/App.jsx` and the route registry in `src/routes/routeConfig.jsx` for navigation. Keep page modules lazy-loaded and render them through the shared loading fallback; do not reintroduce direct `history.pushState` navigation or eager-import every route page.

Date and time values must use the saved `workspace.preferences.date_format`, `workspace.preferences.timezone`, and related localization preferences. Use `src/utils/dateFormatting.js` rather than browser-locale defaults or page-specific date formatters so every module renders dates consistently.

Last Visit-style values use `formatLastVisitForUser`: show `Today` and `Yesterday`, use the weekday for earlier dates in the current configured week, and use the selected date format for older dates.

The authenticated shell is gated by `WorkspaceProvider`. During session/workspace hydration, show the shared neutral loading surface and spinner; render the sidebar and page together only after authoritative workspace data is ready. Workspace failures must show the shared retry state instead of placeholder identity or organization values. Authenticated users without an active organization membership must receive a centralized no-access or suspended-access state before the shell renders; do not duplicate this gate in individual pages.

Unknown record IDs under a valid section route must preserve the parent `PanelView` and render the shared `PanelRecordNotFound` state in its detail pane. Unknown authenticated top-level routes must preserve `AppLayout` and render only the artwork in the main content area. Public splash and authentication routes remain outside the application shell.

Use Lucide icons already installed in the project. Keep icon sizing controlled by the component that owns the shared UI so changes propagate consistently.
Use the Lucide `LoaderCircle` with a scoped rotation animation for page-level loading states; keep the loading container’s layout and spacing stable while data is fetched.

Store production browser and PWA branding assets in `public/`, including the favicon, Apple touch icon, and 192px/512px install icons referenced by `manifest.webmanifest`. Keep icon-set reference sheets outside `public/` so they are not shipped as application assets.

Use `src/components/ui/Avatar.jsx` for every user avatar. Render the uploaded image when available; otherwise derive initials from first and last names, or only the first name when no last name exists, with `A` as the neutral fallback. Do not create page-specific avatar fallback logic.

Use `src/components/ui/Select.jsx` for standard dropdowns. It provides the shared styled trigger, rotating Lucide chevron, focus tokens, outside-click dismissal, keyboard navigation, and listbox semantics. Options may provide `disabled: true` and a Lucide `icon` for unavailable choices or explanatory affordances; disabled options remain muted and non-interactive. Keep specialized selectors, such as phone-country selection, separate only when they need custom option content.

Use `src/components/ui/DataTable.jsx` for reusable sortable tables. Supply column definitions and row renderers rather than copying table markup; the component owns sort state, sortable header icons, responsive overflow, and the empty state.

`PanelViewSelector` owns the reusable panel/table view menu. Its default options are Panel View and a muted, locked Table View until table rendering exists; modules may pass additional view options without copying the selector interaction or menu markup.
The panel view selector uses only a pointer cursor on hover and has no trigger hover or focus visual state; do not add color, background, border, or outline changes for those states. Its label uses primary ink while the view icon and chevron use secondary gray.

## Sidebar reference tokens

- Group headings use `0.8571rem` font size and `1.2857rem` line-height.
- Navigation items use 32px height, 8px padding, and an 8px radius.
- `.page-content` owns scrolling and uses `scrollbar-gutter: stable` so pages do not shift when a scrollbar appears; `.page-content-inner` owns the standard 16px shell inset. Full-bleed `PanelView` pages may offset that inset with matching `-16px` margins, but their visible content must remain one 16px inset from the shell edge.
- Page headers must remain visible while the page scrolls: use the shared sticky treatment for `.page-heading`, `.panel-view-header`, and `.settings-page-header`, with an opaque surface background and stacking order below the sidebar menus.
- The settings page uses a viewport-based two-row layout: the header occupies the first row, the navigation and details share the second-row top edge, and only the details column scrolls. Do not align these areas with fixed pixel offsets.
- The authenticated shell owns page scrolling through `.main-shell` and `.page-content`; settings pages must fill that shell rather than allowing the document body to scroll the entire settings layout. Keep overflow containment scoped to the authenticated shell so public splash and authentication pages retain normal document scrolling on mobile.
- The authenticated shell checks the build-generated `/version.json` and shows a refresh notice only when a newer deployment is detected; keep this update prompt non-blocking and separate from ordinary data refreshes.
- `/settings/general` displays the human-readable build label from `/version.json` at the bottom of its settings card.
- The sidebar account popover and settings navigation share the same section headings, divider, item spacing, radius, and hover treatment; keep their navigation groupings synchronized.
- Notification Settings uses grouped cards with a shared event matrix: event labels in the main column and Email/In-App toggle columns, implemented with the reusable notification row/toggle pattern in `src/pages/SettingsPage.jsx`.
- The reusable `PanelView` list header is opt-in through `showListHeader`; keep it hidden on scaffolded pages until their list actions are implemented.
- Icon-only edit controls use color-only hover feedback with `var(--icon-hover)` (`rgb(97 174 255)`); do not add a hover background behind the icon.
- Sign-out actions use `var(--signout)` (`rgb(236 65 70)`) and `var(--signout-hover)` (`rgb(236 65 70 / 75%)`) with no hover background.
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
