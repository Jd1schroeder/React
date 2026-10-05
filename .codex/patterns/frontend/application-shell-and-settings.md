# Application shell and settings

## Purpose

Preserve shared navigation, authenticated workspace readiness, settings subnavigation, and page-owned scrolling across Workbench settings surfaces.

## Use when

Changing the sidebar, authenticated shell, settings layout, account menu, settings navigation, or page scroll ownership.

## Pattern

- `AppLayout` and `WorkspaceProvider` own authenticated-shell readiness. Wait for session and organization membership hydration; show the shared loading/retry/no-access state rather than placeholder identity or independent page-level access gates.
- Use `sidebarConfig.js` for static navigation configuration; `Sidebar.jsx` owns rendering and interaction. Keep nested destinations visible when their route is active.
- Sidebar width is controlled by `--sidebar-expanded-width` and `--sidebar-collapsed-width` (currently 246px and 50px), with compatibility aliases retained in `tokens.css`. Keep the collapsed root padding at zero, use the active surface token with normal-weight text, and keep navigation scrolling separate from the bottom account/support area.
- Every new sidebar destination uses the shared panel shell unless its interaction model genuinely differs. Put page-specific styles in page/feature stylesheets, not `App.css`.
- The authenticated shell owns page scrolling. Settings are content-height grids with a sticky header and sticky navigation; `.settings-details` and `.settings-content` currently overflow visibly rather than owning an independent scrollport. Do not claim or introduce detail-only scrolling without changing and validating the page layout deliberately.
- Keep page headers sticky with opaque surfaces and below sidebar menus. Preserve `scrollbar-gutter: stable` where the shared page shell uses it.
- Keep account identity and sign-out in the shared account area and source identity from `workspaceService.js`. Keep account/settings navigation groupings synchronized.
- Profile preferences persist through profile/session services; date display uses saved workspace localization and `src/utils/dateFormatting.js`. Linked-device rows use the session service and show explicit loading/empty/error states; the device action confirms in a modal.
- Keep the settings header, navigation, and details aligned through the settings grid, not hard-coded vertical offsets.
- Build-update notices are non-blocking and appear only when `/version.json` indicates a newer deployment. Production PWA icons and browser branding assets belong in `public/`; reference sheets do not.
- Public splash/auth routes remain outside the authenticated shell. Unknown authenticated routes preserve the shell; unknown record IDs preserve their parent panel and use the shared detail not-found state.

## Canonical implementations

- `src/components/layout/AppLayout.jsx`, `WorkspaceContext.jsx`, `Sidebar.jsx`, `sidebarConfig.js`
- `src/pages/settings/SettingsLayout.jsx`, `SettingsPage.jsx`, `src/pages/settings/settingsConfig.js`
- `src/pages/AuthPage.jsx`, `src/components/layout/UpdateNotice.jsx`
- `src/utils/dateFormatting.js`, `public/manifest.webmanifest`

## Related knowledge

- Skills: [Architecture](../../skills/architecture/SKILL.md), [UI](../../skills/ui/SKILL.md), [API](../../skills/api/SKILL.md), [Security](../../skills/security/SKILL.md)
- Decisions: [001 — Frontend platform and routing](../../decisions/001-frontend-platform-and-routing.md), [002 — Client state and navigation](../../decisions/002-client-state-and-navigation.md), [003 — Supabase service data access](../../decisions/003-supabase-service-data-access.md)
