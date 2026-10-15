# Workbench Mobile UI Standard

This is the canonical baseline for Workbench screens at the mobile breakpoint
(`max-width: 840px`). It is intended for the interaction-heavy forms, lists,
tables, and dashboards that make up most of the product. A screen whose primary
purpose is long-form reading may use the readable body size below.

The baseline is adapted from [Learn UI Design's responsive website font-size guidelines](https://www.learnui.design/blog/mobile-desktop-website-font-size-guidelines.html#mobile-web),
especially its recommendations to start near 17px, keep text inputs at least
16px, use secondary text about 2px smaller, and limit the number of type sizes.

## Type scale

Use the smallest number of roles that communicates hierarchy. Do not introduce a
new size for an individual page or component without a clear hierarchy need.

| Role               | Size |                                                                                              Line height | Use                                                                        |
|--------------------|-----:|---------------------------------------------------------------------------------------------------------:|----------------------------------------------------------------------------|
| Page title         | 28px |                                                                  `var(--mobile-line-height-title)` (1.2) | The primary title for a mobile page or sheet                               |
| Section title      | 20px |                                                               `var(--mobile-line-height-control)` (1.25) | Group headings and prominent card titles                                   |
| Body / control     | 16px | `var(--mobile-line-height-copy)` (1.5) for copy, `var(--mobile-line-height-control)` (1.25) for controls | Default for menus, lists, labels, buttons, inputs, and dense UI            |
| Readable body      | 17px |                                                                                                  1.5–1.6 | Paragraphs and text-heavy content                                          |
| Secondary          | 14px |                                                                                                  1.4–1.5 | Supporting descriptions, timestamps, and less-important labels             |
| Caption / tertiary | 13px |                                                                                                 1.35–1.4 | Compact metadata only; never the sole presentation of required information |

The 16px body/control size is the Workbench default because Workbench is mostly
interaction-heavy. Use 17px when reading comfort is the primary goal. Keep
secondary text visually subordinate with color and weight as well as size; do
not rely on low contrast alone.

Use the semantic variables in `src/styles/tokens.css` rather than literal px
values. Workbench uses a 14px document root, so the mobile tokens intentionally
use rem values that render to the sizes in this table.

## Inputs and controls

- Text-like inputs, selects, date fields, and textareas must render at least
  16px text. Never use a mobile input size below `var(--mobile-input-font-size)`;
  iOS Safari may zoom smaller inputs and disrupt the form.
- Use `var(--mobile-control-min-height)` (44px) as the minimum hit area for any
  interactive control, including icon-only buttons.
- Prefer `var(--mobile-control-height)` (48px) for primary form inputs and
  buttons. A control may be shorter only when it remains easy to operate and
  its full hit area is still at least 44px.
- Give text inputs at least 12px vertical padding and 16px horizontal padding
  unless an established shared control has a stronger existing contract.
- Use at least 8px between adjacent controls, 16px between fields, and 24px
  between field groups or sections.
- Textareas should start at `var(--mobile-textarea-min-height)` (96px) and allow
  vertical resizing when the content can exceed that space.
- Keep labels and their controls visually associated. Place the label above the
  field for narrow layouts unless a compact, accessible alternative is already
  established by the component.

## Layout and readability

- Use a 16px page gutter (`var(--mobile-page-gutter)`) unless the shared shell
  or a full-bleed surface intentionally owns the edge treatment.
- Keep the 8px spacing rhythm for small gaps and avoid tightly packing unrelated
  controls.
- For mobile copy, avoid layouts that produce fewer than roughly 30 characters
  per line. Increase the type size or adjust the content width when reading
  feels cramped.
- Let labels and button text wrap when needed; do not reduce text below the
  standard to force a single line.
- Preserve visible keyboard focus, sufficient color contrast, and the existing
  reduced-motion behavior.

## Responsive PWA strategies

Mobile is the primary design constraint, but Workbench can also run as a
resized installed PWA, a tablet app, or a narrow desktop window. Build from the
content and available space rather than from a list of device-specific widths.

- Use flexible Grid and Flexbox layouts. Prefer intrinsic patterns such as
  `repeat(auto-fill, minmax(200px, 1fr))`, wrapping controls, and `minmax()`
  over fixed-width cards that force horizontal scrolling.
- Use relative units (`rem`, `%`, `fr`, `vw`, and `dvh`) where they allow the
  layout to adapt. Keep breakpoints in the existing Workbench media-query
  system; do not add a device-specific breakpoint when wrapping or intrinsic
  sizing solves the problem.
- Treat hover as an enhancement only. Every hover action must have an equivalent
  tap, click, or keyboard path, using semantic buttons and links instead of
  clickable generic containers.
- Keep mobile navigation thumb-friendly. Bottom navigation is appropriate for
  primary destinations; use scrollable tabs for dense secondary navigation and
  switch to the existing sidebar or wider layout at larger widths.
- Preserve a unique URL for each navigable section so mobile routes can be
  bookmarked, shared, and restored. If a manifest shortcut is added later, it
  should point only to stable, permission-aware routes.
- Respect safe areas for installed/full-screen displays. Fixed headers and
  bottom navigation should account for `env(safe-area-inset-top)` and
  `env(safe-area-inset-bottom)` without hiding controls behind device cutouts.
- Never disable user zoom with `user-scalable=no` or `maximum-scale=1`. Text and
  layout must remain usable when the user increases text size or zooms to 200%.

### Performance and offline behavior

Responsive behavior includes how the app behaves on a slow or missing network.
Apply these strategies at the service/data layer when PWA infrastructure is
available; the UI should always communicate freshness and connectivity state.

| Content                                        | Strategy                              | UI expectation                                                                                 |
|------------------------------------------------|---------------------------------------|------------------------------------------------------------------------------------------------|
| App shell, CSS, JS, fonts, stable icons        | Cache first                           | Render the shell quickly and show a clear offline state when data is unavailable               |
| Frequently updated lists and feeds             | Stale-while-revalidate                | Show cached content immediately, then refresh without blocking the shell                       |
| User-specific or safety-sensitive dynamic data | Network first                         | Prefer fresh data and provide an explicit cached/offline fallback                              |
| Large uploads/downloads                        | Background fetch/sync where supported | Show queued, retrying, and completed states; never imply a write succeeded before confirmation |

For mobile assets, serve appropriately sized responsive images using `srcset`
and `sizes`, use modern formats when supported, reserve image dimensions to
avoid layout shifts, lazy-load below-the-fold media, and prioritize only a
confirmed above-the-fold lead image. Honor reduced-data conditions when the
platform exposes them.

## Validation standard

Validate new mobile UI at narrow phone, larger phone, tablet, and a narrow
resized-window state. Include touch, keyboard, screen-reader semantics, zoomed
text, portrait/landscape orientation, slow-network, and offline states. Use
real devices when possible; browser emulation is a supplement, not a
replacement. For PWA changes, also check the manifest, install surface,
safe-area behavior, Lighthouse accessibility/PWA checks, layout stability, and
the appropriate cache/offline fallback.

## Migration guidance

New mobile UI should use these tokens from the start. Existing screens should be
migrated component-by-component when they are changed; this standard does not
require a broad visual rewrite. The audit identified compact legacy controls in
shared and feature CSS, so those remain explicit migration work rather than
being silently treated as compliant. Feature-specific exceptions should be
documented next to the component and should preserve the 16px input minimum and
44px touch target unless there is a tested platform-specific reason.

### Example

```css
.mobile-form-input {
  min-height: var(--mobile-control-height);
  padding: var(--spacing-3) var(--spacing-5);
  font-size: var(--mobile-input-font-size);
  line-height: var(--mobile-line-height-control);
}
```
