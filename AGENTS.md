# AGENTS.md

# Project Agent Operating System

This file defines how AI coding agents operate in this repository.

The objective is not merely to complete individual coding tasks. Agents must continuously improve their understanding of this project and preserve durable knowledge so that future agents can make better decisions without rediscovering the same information.

The repository's institutional memory is maintained primarily through Skills.

---

# 1. Core Operating Principle

Treat this repository as a long-lived software system rather than a collection of isolated coding tasks.

Every task should be approached with five questions:

1. What does the user want?
2. What does the existing system already do?
3. What project-specific knowledge applies to this task?
4. What new durable knowledge will this task reveal?
5. What should be preserved so a future agent does not have to rediscover it?

Do not optimize only for completing the immediate request.

Optimize for:

* correctness
* consistency
* maintainability
* reuse
* preservation of project knowledge
* minimizing repeated mistakes
* reducing future agent reasoning
* maintaining architectural coherence

---

# 2. Instruction Hierarchy

Follow instructions in this order:

1. Explicit instructions from the user in the current task
2. Applicable instructions in this AGENTS.md
3. More specific AGENTS.md files closer to the files being modified
4. Applicable Skills
5. Existing project architecture and established implementation patterns
6. General engineering conventions

If a user explicitly requests behavior that differs from an established project convention, follow the user's request unless doing so would violate a higher-priority instruction.

When deviating from an established project convention, determine whether the deviation represents a new architectural decision that should be preserved in project memory.

---

# 3. Institutional Memory Architecture

Project knowledge is distributed across several layers.

Use each layer for the type of information it is best suited to contain.

## AGENTS.md

Contains:

* agent operating rules
* project-wide development rules
* skill discovery rules
* institutional-memory rules
* decision-making rules
* rules for maintaining Skills

Do not turn AGENTS.md into a repository encyclopedia.

---

## Skills

Skills contain durable, reusable knowledge.

Examples:

* UI conventions
* architecture
* database conventions
* API conventions
* testing strategies
* deployment procedures
* integrations
* security practices
* domain knowledge
* recurring bugs and solutions
* business rules
* operational procedures

Skills should answer:

> "What does an agent need to know when working in this area of the system?"

---

## Source Code

The source code remains the authoritative source for implementation behavior.

Never update a Skill merely to make it agree with an incorrect implementation.

When documentation and implementation disagree:

1. Determine the intended behavior.
2. Inspect history and surrounding code when useful.
3. Correct the implementation or documentation as appropriate.
4. Update the Skill if the knowledge is durable.

---

## Decision Records

Important architectural decisions should be preserved as explicit decision records when appropriate.

Use decision records for decisions such as:

* choosing a framework
* choosing a database strategy
* changing an architectural pattern
* selecting an integration approach
* establishing an important security boundary
* deliberately accepting a technical tradeoff
* replacing a previous convention

Decision records should explain:

* context
* decision
* alternatives considered
* consequences

Do not use decision records for routine implementation details.

---

# 4. Skill Registry

Skills live under:

```
.codex/skills/
```

Each Skill should have its own directory containing a `SKILL.md`.

Example:

```
.codex/
  skills/
    ui/
      SKILL.md
    architecture/
      SKILL.md
    database/
      SKILL.md
    api/
      SKILL.md
    testing/
      SKILL.md
    integrations/
      SKILL.md
    deployment/
      SKILL.md
    domain/
      SKILL.md
```

The Skill directory structure may evolve as the project grows.

Before creating a new Skill, inspect existing Skills to determine whether the knowledge belongs in an existing one.

Avoid creating overlapping Skills.

---

# 5. Skill Discovery

Before beginning implementation, determine which Skills may apply.

Use the task description, affected files, architecture, and requested behavior to identify relevant Skills.

Typical mappings include:

## UI

Use the UI Skill for:

* pages
* layouts
* components
* styling
* forms
* dialogs
* tables
* dashboards
* navigation
* responsive behavior
* accessibility
* visual consistency

## Architecture

Use the Architecture Skill for:

* new modules
* major refactoring
* service boundaries
* data flow
* dependency changes
* architectural patterns

## Database

Use the Database Skill for:

* schema changes
* migrations
* queries
* indexes
* data access
* persistence behavior

## API

Use the API Skill for:

* endpoints
* request/response contracts
* authentication
* authorization
* integrations
* API versioning

## Testing

Use the Testing Skill for:

* unit tests
* integration tests
* end-to-end tests
* test architecture
* mocking
* fixtures
* validation strategy

## Deployment

Use the Deployment Skill for:

* builds
* environments
* infrastructure
* deployment procedures
* release configuration

## Domain

Use Domain Skills for project-specific business rules and operational behavior.

These examples are not exhaustive.

---

# 6. Load Skills Before Making Decisions

When a Skill is applicable:

1. Read the Skill.
2. Identify its relevant rules.
3. Inspect the existing implementation referenced by the Skill.
4. Follow established patterns where appropriate.
5. Identify conflicts between the Skill and the current codebase.
6. Resolve conflicts rather than blindly following stale documentation.

Do not assume a Skill is correct merely because it exists.

Skills are institutional memory, not unquestionable authority.

The actual codebase and explicit user requirements remain critical sources of truth.

---

# 7. Continuous Institutional Memory

Every completed task is an opportunity to improve project memory.

After implementing a task, perform an institutional-memory review.

Ask:

> Did this task reveal knowledge that will probably matter again?

Potential examples include:

* a reusable UI pattern
* a new component convention
* an architectural constraint
* a database behavior
* an integration quirk
* a recurring bug
* an environment limitation
* a testing requirement
* a naming convention
* a performance constraint
* a security requirement
* a business rule
* a deployment requirement
* a workaround that future agents need to know

If the answer is yes, preserve the knowledge.

---

# 8. The Reuse Test

Before adding knowledge to a Skill, evaluate it using this test:

Would knowing this information likely help an agent performing another task in the future?

If yes:

* update an existing Skill, or
* create a new Skill if the subject is genuinely distinct.

If no:

* do not add it to institutional memory.

Do not document every implementation detail.

Institutional memory should contain durable knowledge, not a diary of development activity.

---

# 9. Skill Creation Rules

Create a new Skill when all or most of the following are true:

* the knowledge is reusable
* the knowledge applies to multiple future tasks
* the knowledge represents a coherent subject area
* the knowledge does not belong naturally in an existing Skill
* future agents would benefit from discovering it automatically

Examples:

Good new Skill:

```
.codex/skills/plant-equipment-domain/SKILL.md
```

Poor new Skill:

```
.codex/skills/fix-login-button-2026-09-17/SKILL.md
```

Do not create Skills for individual tickets, bug fixes, conversations, or temporary tasks unless they reveal a reusable pattern.

---

# 10. Skill Updating Rules

Prefer updating an existing Skill over creating a new Skill when the new knowledge belongs to the same conceptual area.

When updating a Skill:

* preserve still-valid knowledge
* add the new durable rule
* remove obsolete rules
* resolve contradictions
* consolidate duplicates
* keep examples representative
* avoid recording temporary implementation details

A Skill should become more useful over time, not simply become longer.

---

# 11. Skill Quality Standard

Every Skill should be:

* concise
* specific
* actionable
* project-aware
* internally consistent
* current
* reusable
* easy for an agent to scan

Prefer:

> Use `EquipmentSelector` when selecting plant equipment.

Over:

> The equipment selector component is something that was created previously and can be useful in some circumstances.

Write Skills as instructions and durable facts.

Avoid conversational history.

Avoid statements such as:

> We discovered this last Tuesday.

Instead write:

> Equipment selection must use `EquipmentSelector` because equipment IDs require validation against the plant equipment registry.

Preserve the reason when the reason is important to future decision-making.

---

# 12. Evidence Before Institutionalizing Knowledge

Do not record assumptions as facts.

Before adding important information to a Skill, verify it using available evidence such as:

* source code
* configuration
* tests
* database schema
* API definitions
* existing documentation
* commit history
* runtime behavior
* user-provided requirements

If the behavior is uncertain, do not present it as established project knowledge.

Instead, either:

* investigate further, or
* explicitly mark the knowledge as uncertain if it is still useful.

---

# 13. Avoiding Knowledge Drift

Institutional memory must not become stale.

When modifying an area of the system:

1. Check whether related Skills exist.
2. Compare their guidance with the implementation.
3. Identify obsolete guidance.
4. Update the Skill when necessary.

If a major implementation change invalidates a Skill, update the Skill as part of the same task.

Do not knowingly leave contradictory institutional memory behind.

---

# 14. Avoiding Duplicate Knowledge

Before creating or substantially expanding a Skill, search existing Skills for related concepts.

If information appears in multiple Skills:

* determine the canonical Skill
* move the durable rule there
* replace duplicated versions with references where appropriate

Avoid maintaining the same rule in multiple locations.

Duplicated knowledge eventually diverges.

---

# 15. Skill Scope

Keep Skills focused.

A Skill should answer a coherent class of questions.

For example:

Good:

```
UI
Database
API
Testing
Deployment
```

Potentially too broad:

```
Everything About The Application
```

If a Skill becomes difficult to scan or contains unrelated subjects, split it into focused Skills.

Do not split Skills merely to reduce file length.

---

# 16. Cross-Skill Relationships

Skills may depend on one another.

When appropriate, document relationships explicitly.

For example:

```
UI
  ↓
API
  ↓
Domain
  ↓
Database
```

If a UI convention depends on an API contract, the UI Skill may reference the relevant API Skill.

Do not copy the API rules into the UI Skill.

Reference the canonical source instead.

---

# 17. Conflict Resolution

When multiple Skills provide conflicting guidance:

1. Determine whether one Skill is more specific.
2. Inspect the current implementation.
3. Check decision records when available.
4. Determine whether one rule is obsolete.
5. Resolve the contradiction.
6. Update the affected Skills.

Do not silently choose one contradictory rule while leaving the conflict documented.

Institutional memory should converge toward one coherent model.

---

# 18. Learning From Bugs

When fixing a bug, determine whether the underlying cause represents reusable knowledge.

If it does, record:

* the underlying cause
* the correct behavior
* the relevant constraint
* the preferred implementation pattern
* how to avoid recurrence

Do not merely document:

> Bug fixed.

Document the reusable lesson.

Example:

Bad:

```
Fixed date bug in production dashboard.
```

Better:

```
Production timestamps are stored in UTC. UI components must convert
timestamps to the configured plant timezone before displaying dates.
```

---

# 19. Learning From User Corrections

Treat repeated user corrections as potential project knowledge.

If the user repeatedly specifies that something should work a particular way, determine whether that behavior is a durable project requirement.

If it is:

* preserve it in the appropriate Skill
* avoid requiring the user to repeat the instruction

Do not automatically institutionalize every preference.

Only preserve preferences that are clearly project-specific and durable.

---

# 20. Learning From Failed Approaches

Failed approaches can contain valuable institutional knowledge.

When an approach fails because of a project-specific constraint, preserve the lesson when it is likely to prevent future wasted effort.

Example:

> Do not use direct database access from the frontend. The application requires all equipment queries to pass through the equipment service because authorization is enforced there.

Do not document ordinary trial-and-error that has no future value.

---

# 21. Architectural Decisions

When a task introduces a significant architectural decision, determine whether it should become a decision record.

Examples:

* changing state-management architecture
* introducing a new service
* changing database strategy
* introducing a new integration
* replacing a framework
* changing authentication architecture

Do not hide significant architectural decisions only inside a Skill.

Skills describe how to work with the system.

Decision records explain why significant decisions were made.

---

# 22. Automatic Knowledge Maintenance

Agents should proactively maintain institutional memory.

Do not wait for the user to say:

> Update the Skill.

If a durable reusable lesson is discovered, update the appropriate Skill as part of completing the task.

Likewise, do not ask for permission to make routine documentation improvements that are directly supported by the work being performed.

However, do not make speculative or broad changes to institutional memory without evidence.

---

# 23. Knowledge Consolidation

Periodically evaluate the Skill collection.

Look for:

* duplicate Skills
* overlapping Skills
* obsolete Skills
* contradictory rules
* rules that belong in another Skill
* overly large Skills
* overly narrow Skills
* undocumented important conventions

When appropriate, consolidate Skills.

Do not perform large-scale restructuring merely for cosmetic reasons during unrelated work.

Prefer incremental improvement.

---

# 24. Skill Change Discipline

When modifying a Skill, make the smallest change necessary to accurately preserve the new knowledge.

Do not rewrite an entire Skill merely because one section changed.

Do not remove established guidance unless it is demonstrably obsolete, incorrect, or superseded.

When removing an important rule, verify that no current implementation still depends on it.

---

# 25. Task Completion Workflow

For every coding task, follow this general workflow:

Scale the workflow to the request. Explanations, read-only reviews, and trivial one-line edits do not require Skill or decision-record changes. Meaningful implementation work should complete the discovery, implementation, validation, and institutional-memory phases below.

Use this routing gate before implementation:

1. If the request is not a coding change, answer or review it directly.
2. If it is a coding change, read this file and inspect the affected implementation.
3. Load only the Skills that apply to the affected area.
4. Implement using existing abstractions before adding new ones.
5. Run `npm.cmd run verify` for the standard lint and production-build checks.
6. Update or create a Skill only when the task establishes reusable project knowledge.
7. Create a decision record only when the task makes a meaningful architectural choice.

## Phase 1 — Understand

Determine:

* requested outcome
* affected functionality
* affected files
* likely architectural areas
* applicable Skills
* relevant existing patterns

## Phase 2 — Learn

Read applicable Skills.

Inspect relevant implementation.

Identify established conventions.

Do not begin designing a new solution until existing patterns have been considered.

## Phase 3 — Plan

Develop an implementation approach consistent with:

* user requirements
* project architecture
* applicable Skills
* existing code

## Phase 4 — Implement

Make the required changes.

Prefer existing abstractions over introducing duplicates.

Follow established conventions unless there is a justified reason not to.

## Phase 5 — Validate

Run appropriate:

* tests
* type checks
* linting
* builds
* static analysis
* relevant runtime validation

Use the project's established validation mechanisms. For this frontend, `npm.cmd run verify` is the default combined check; add targeted runtime or visual validation when the change affects behavior or layout.

## Phase 6 — Institutional Memory Review

Before finishing, ask:

* Did I discover a reusable pattern?
* Did I discover a project constraint?
* Did I establish a new convention?
* Did I uncover a recurring bug pattern?
* Did I learn something future agents should know?
* Did the implementation invalidate existing Skill guidance?
* Should an existing Skill be updated?
* Should a new Skill be created?
* Should an architectural decision be recorded?

Update institutional memory when justified.

## Phase 7 — Final Verification

Confirm that:

* implementation is complete
* validation has been performed
* relevant Skills are current
* no obvious contradictions were introduced
* durable knowledge discovered during the task has been preserved

---

# 26. Do Not Over-Learn

Institutional memory can become harmful if it records too much.

Do not preserve:

* temporary debugging information
* one-off implementation details
* personal conversation details
* speculative assumptions
* transient environment state
* arbitrary preferences
* information already obvious from the source code
* historical details that no longer affect implementation

The objective is high-value knowledge density.

---

# 27. Project Knowledge Should Reduce Future Reasoning

A successful Skill should make future work easier.

When writing institutional memory, prefer information that allows an agent to quickly answer:

* What should I use?
* What should I avoid?
* Why?
* Where does the existing implementation live?
* What constraint matters?
* What pattern is already established?
* What mistake should I avoid repeating?

If a Skill does not help answer those questions, reconsider whether the information belongs there.

---

# 28. References to Implementation

Whenever practical, Skills should reference relevant implementation locations.

Example:

```
Equipment selection is implemented by:
`src/components/equipment/EquipmentSelector.tsx`
```

References help agents move from institutional knowledge to concrete implementation.

Update references if files are moved.

Do not allow Skills to accumulate dead references.

---

# 29. User Intent Overrides Historical Convention

Historical project conventions are not automatically more important than the current requirement.

If the user intentionally asks for a new pattern:

1. implement the requested behavior
2. determine whether it represents a new project convention
3. update the appropriate Skill if it is likely to recur
4. remove or revise the old convention if it has been superseded

Institutional memory must evolve.

It must not prevent legitimate evolution of the system.

---

# 30. Final Principle

The repository should become easier for an intelligent agent to work on over time.

Every meaningful task should ideally leave the system in one of two states:

1. the project is unchanged except for the requested implementation, or
2. the project is improved by the requested implementation plus a small amount of durable institutional knowledge.

Never allow institutional memory to become a dumping ground.

Build it deliberately.

Prefer durable knowledge over historical narrative.

Prefer canonical sources over duplicated information.

Prefer evidence over assumptions.

Prefer updating existing knowledge over creating duplicates.

The long-term objective is for a new agent entering this repository to understand the project's architecture, conventions, constraints, and lessons significantly faster than the previous agent did.

That is the purpose of the Skills system.
