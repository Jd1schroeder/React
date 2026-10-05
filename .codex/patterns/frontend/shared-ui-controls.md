# Shared UI controls

## Purpose

Reuse Workbench controls so keyboard behavior, visual tokens, accessibility semantics, and interaction details stay consistent.

## Use when

Building a form, table, selection control, image input, avatar, or reusable menu.

## Pattern

- Use `Button`, `Select`, `DatePicker`, `DataTable`, `Avatar`, and `ImageDropzone` from `src/components/ui/` where their interaction fits; extend the shared component before creating a parallel control.
- Use the shared `PriorityBadge` to display Work Order priorities consistently in list and detail views; keep the visible priority label, Lucide indicator, and token-based tone together instead of recreating page-specific badges.
- `Avatar` owns image/initial fallback behavior. `ImageDropzone` owns image filtering, drag state, previews/removal, and its hidden input. `DataTable` owns sorting, responsive overflow, and empty presentation.
- `Select` owns outside-click dismissal, keyboard navigation, listbox semantics, and its rotating chevron. Use its multiple/avatar options for assignment controls; keep specialized option renderers separate only when their content truly differs.
- `DatePicker` opens from its calendar icon while adjacent date text remains editable and emits ISO dates. Keep its calendar-specific styles in `DatePicker.css`.
- Use `PresetNumberInput` when a numeric value needs suggestions but must still accept arbitrary input; native `<datalist>` popups are browser-controlled and cannot match the app menu.
- Keep shared tokens in `src/styles/tokens.css`; feature styles use semantic tokens and scope page-specific layout to the owning page stylesheet.
- Keep focus treatment on the shared `--focus-border-width`/`--focus-border-color` tokens. For decorative/brand colors, centralize values in tokens; use the shared warning surface token for pale warning backgrounds.
- Keep visual structure semantic and keyboard operable. Respect reduced-motion settings for nonessential animation.
- Use Lucide icons from the installed icon set and size them in the component that owns the shared UI. Page-level loading uses a layout-stable `LoaderCircle` state.
- For supplied reference HTML, preserve element hierarchy and element types; replace reference-specific names with Workbench names and retain the existing shared controls/tokens.

## Canonical implementations

`src/components/ui/Select.jsx`, `DatePicker.jsx`, `DataTable.jsx`, `Avatar.jsx`, `ImageDropzone.jsx`, `PresetNumberInput.jsx`, `PriorityBadge.jsx`, `PriorityBadge.css`, and `src/styles/tokens.css`.

## Related knowledge

- Skills: [UI](../../skills/ui/SKILL.md), [MaintainX UI reference](../../skills/maintainx-ui-reference/SKILL.md), [Testing](../../skills/testing/SKILL.md)
