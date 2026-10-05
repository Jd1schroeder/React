# Decision 010: Institutional memory architecture

## Context

The repository's operating instructions had grown into a long file containing agent workflow, area-specific rules, architectural reasoning, and implementation details. Project knowledge was split between `.codex/decisions/` and `docs/decisions/`, and a new agent had no selective index for finding relevant material.

## Decision

Use five distinct knowledge layers: `AGENTS.md` defines agent operations; `.codex/skills/INDEX.md` routes to broad area Skills; `.codex/patterns/INDEX.md` routes to evidence-backed implementation recipes; `.codex/decisions/INDEX.md` routes to architectural rationale; source code remains current behavioral truth. Load knowledge selectively and use references instead of duplicating detailed rules.

Promote an observation only when it is project-specific, likely to recur, and supported by evidence. Put broad development guidance in a Skill, a proven reusable implementation recipe in a Pattern, and consequential alternatives/tradeoffs in a Decision. Do not preserve one-off task history. Review relevant knowledge for drift during later work.

## Alternatives considered

- Keep all guidance in `AGENTS.md`: rejected because every task would receive unrelated context and the operating file becomes an encyclopedia.
- Read all Skills/Decisions on every task: rejected because it defeats selective retrieval.
- Create automated indexing infrastructure: rejected because Markdown indexes and explicit cross-references meet the current repository's needs with less maintenance.

## Consequences

- One canonical decision directory and concise indexes provide discovery; relevant individual files hold detail.
- Patterns must be grounded in repeated code, a canonical implementation, or explicit architecture—not created to fill a catalog.
- Source/documentation conflicts are resolved by investigating intent and current implementation, then correcting the appropriate layer.
- Indexes and canonical source references must be kept valid as files and architecture evolve.

## Related knowledge

- Operating workflow: `AGENTS.md`
- Discovery indexes: [Skills](../skills/INDEX.md), [Patterns](../patterns/INDEX.md), [Decisions](INDEX.md)
