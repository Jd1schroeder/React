# Workbench Agent Operating Instructions

This file defines how an AI coding agent works in this repository. It is an operating guide, not a catalog of application rules.

## 1. Operating principles

- Understand the requested outcome, inspect current behavior, and use the smallest implementation that fits existing architecture.
- Treat Workbench as a long-lived system: preserve correctness, consistency, maintainability, and reusable project knowledge.
- Make changes only within the user's requested scope. Do not infer authority for unrelated product changes or external side effects.
- Preserve existing worktree changes unless their ownership and relevance are clear. Never discard user data or unrelated edits to make a task easier.
- When the user supplies exact structure, CSS, or interaction requirements, follow them precisely unless they conflict with a higher-priority safety or accessibility requirement; explain any necessary deviation.

## 2. Instruction and truth order

Follow platform and developer requirements, then the user's explicit current request. For repository guidance, apply:

1. This `AGENTS.md`.
2. The closest applicable nested `AGENTS.md`.
3. Relevant Skills, Patterns, and Decisions.
4. Current source code, tests, configuration, and runtime evidence.
5. General engineering conventions.

User intent may intentionally change a historical convention. Source code is authoritative for what the application currently does; it does not override explicit user intent. If documentation and implementation conflict, investigate intent, history, and tests before changing either one.

## 3. Knowledge architecture and discovery

The repository maintains five complementary knowledge layers:

| Layer                                     | Responsibility                                                                                            |
|-------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `AGENTS.md`                               | Agent workflow, instruction handling, discovery, validation, and memory maintenance.                      |
| `.codex/skills/INDEX.md` and Skills       | Find broad areas of project knowledge; a Skill explains reusable practices and constraints for that area. |
| `.codex/patterns/INDEX.md` and Patterns   | Find evidence-backed, repeatable implementation recipes and their canonical source examples.              |
| `.codex/decisions/INDEX.md` and Decisions | Explain why consequential architectural choices were made and their tradeoffs.                            |
| Source code and tests                     | Define current application behavior.                                                                      |

For each task:

1. Read this file and any more-specific `AGENTS.md` that governs affected files.
2. Identify affected areas, then consult `.codex/skills/INDEX.md` and load only the applicable Skills.
3. Consult `.codex/patterns/INDEX.md` and load only Patterns matching the problem.
4. Consult `.codex/decisions/INDEX.md` for relevant architectural rationale.
5. Inspect each referenced canonical implementation and the adjacent tests/configuration before designing changes.

Do not load every Skill, Pattern, or Decision by default. Follow cross-references only as needed; indexes route discovery and are not substitutes for the underlying guidance.

## 4. Implementation workflow

### Understand

- Determine the user-visible outcome, affected behavior/files, constraints, and expected validation.
- Search for existing abstractions and examples before introducing a new component, service, route, schema, or dependency.
- Distinguish requested changes from adjacent opportunities. Ask the user only when a missing choice materially changes scope or outcome.

### Plan and implement

- Follow explicit user requirements and current architecture; reuse canonical Patterns where they fit.
- Keep shared behavior in shared components/services and feature-specific behavior within the owning feature boundary.
- Keep UI, transport, domain, and authorization responsibilities separated as described by the relevant Skills.
- Do not weaken authorization, tests, or validation to make an implementation pass.
- For database changes, preserve forward-only migration safety. For UI changes, honor supplied DOM hierarchy/computed styles when applicable and verify the rendered behavior.

### Validate

- Run `npm.cmd run verify` for normal frontend changes. It runs repository checks, tests, lint, and production build.
- Add focused tests or runtime/visual checks when risk or interaction complexity warrants them.
- For security-sensitive database changes, follow the Security Skill and `docs/security-verification.md`; do not claim live RLS validation without running it.
- If a check cannot run, state the exact limitation and what was validated instead.

## 5. Institutional-memory maintenance

Memory should become more accurate and useful without becoming a task diary or forcing unrelated context into every task.

After meaningful work, ask whether it revealed durable, project-specific knowledge likely to help another task. Promote an observation only when it is supported by code, tests, configuration, an explicit durable requirement, or other reliable evidence.

Use this routing test:

1. Is the information project-specific and likely to matter again? If not, do not preserve it.
2. Does an existing Skill own broad reusable guidance? Update that Skill.
3. Is it a proven repeatable implementation recipe? Create or update a Pattern.
4. Does it explain a consequential choice, alternatives, or accepted tradeoff? Create or update a Decision.
5. Otherwise, leave it in source code or the task; do not institutionalize it.

Most tasks should not create new permanent knowledge. A successful implementation alone is not a reason to create a document.

### Keep knowledge healthy

- Prefer one canonical rule with concise references over duplicated copies.
- Skills explain how to work in a broad area; Patterns capture how a proven implementation is structured; Decisions capture why a significant choice exists.
- Patterns require evidence: repeated consistent implementations, a declared canonical implementation, or an explicit architectural convention. Do not create Patterns to fill an index.
- Decisions should record context, decision, important alternatives, consequences, and relevant source areas. Keep IDs unique and indexes/references current; check repository references before renaming records.
- Add canonical source paths when they help agents move from guidance to current behavior. Remove or correct dead references when code moves.
- Keep uncertainty explicit. Never turn an assumption, temporary workaround, or external-product observation into an authoritative Workbench rule.
- Treat repeated user corrections and failed approaches as signals to investigate; preserve them only when evidence shows a durable project requirement or reusable lesson.
- When touching an area, check relevant memory for drift. Resolve contradictions rather than silently choosing one version.
- Consolidate duplicates and remove obsolete guidance only after verifying the replacement or confirming that it no longer applies.
- Update indexes whenever Skills, Patterns, or Decisions are added, renamed, consolidated, or retired.

## 6. Editing discipline

- Make focused changes; preserve valid existing guidance and user edits.
- Use `apply_patch` for local text/code edits. Avoid broad rewrites unless the task explicitly calls for a migration.
- Do not introduce documentation automation, external services, or indexing infrastructure without a demonstrated need; Markdown and explicit indexes are the default.
- Do not use knowledge files to duplicate source code, record chronological conversation, or document temporary debugging state.
- Keep user-facing updates concise during longer work and report outcomes, validation, remaining blockers, and relevant files at handoff.

## 7. Completion review

Before finishing, verify:

- the requested behavior is implemented and scoped;
- relevant validation ran and results are accurately reported;
- relevant Skills, Patterns, and Decisions agree with current source;
- new or changed knowledge has valid index entries and source references;
- no unrelated user changes were removed or overwritten.
