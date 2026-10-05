# Skill Index

Load only the Skills that match the current change. Start with the task area, then follow any linked Pattern or Decision; do not read the whole library by default.

| Skill | Purpose and when to load | Related Patterns | Related Decisions |
|---|---|---|---|
| [API](api/SKILL.md) | Supabase, Edge Functions, backend contracts, and browser/backend integration. | Supabase service boundary; secure attachment workflow; permissioned feature | 003–009 |
| [Architecture](architecture/SKILL.md) | Route, layout, module boundaries, shared state, or dependency changes. | Panel page and route; Supabase service boundary | 001–003 |
| [Database](database/SKILL.md) | Schema, migrations, RPCs, indexes, and persisted data behavior. | Supabase service boundary; secure attachment workflow; permissioned feature | 003–009 |
| [Domain](domain/SKILL.md) | Maintenance workflow terminology and business rules. | Categorized Work Order inbox; Work Order form/detail; organization administration | 004–005, 008–009 |
| [MaintainX UI reference](maintainx-ui-reference/SKILL.md) | The user supplies MaintainX markup, computed styles, screenshots, or interactions. | Panel page and route; Work Order inbox; shared controls | 001, 005, 008 |
| [Security](security/SKILL.md) | Authentication, authorization, RLS, Storage, security headers, or security review. | Permissioned feature; secure attachment workflow | 004–009 |
| [Testing](testing/SKILL.md) | Tests, validation strategy, or a change requiring verification. | Relevant feature Pattern | Relevant feature Decision |
| [UI](ui/SKILL.md) | Page structure, components, layout, CSS, accessibility, or interaction behavior. | Panel page and route; categorized inbox; Work Order form/detail; organization administration; shared controls | 001–002, 005, 008–009 |

Decision numbers refer to [the Decision Index](../decisions/INDEX.md). Patterns are indexed at [`.codex/patterns/INDEX.md`](../patterns/INDEX.md).

## Routing sanity checks

- Add an equipment detail page → UI + Domain Skills; panel page/route Pattern; Decisions 001–003; inspect `Assets.jsx` and `PanelView.jsx`.
- Add a Work Order endpoint or query → API + Domain + Security Skills; service-boundary and inbox Patterns; Decisions 003, 006, 009.
- Change a persisted schema → Database + Domain Skills; applicable data-access/security Patterns; inspect migrations and the owning service.
- Fix an authorization bug → Security + API + Testing Skills; permissioned-feature Pattern; Decision 006 and relevant RLS/RPC source.
- Add a reusable UI component → UI + Testing Skills; shared-controls Pattern; inspect `src/components/ui/` before implementation.
- Replace state management → Architecture + UI Skills; panel/shell Patterns; Decisions 001–002 and current `WorkspaceContext`/route implementation.
