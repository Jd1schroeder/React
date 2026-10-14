---
name: testing
description: Validate Workbench changes using risk-based testing, dependency analysis, regression prevention, security verification, and evidence-based reporting.
---

# Testing Skill

## 1. Purpose

Validate Workbench changes before declaring implementation complete.

Select and execute tests based on the actual impact and risk of each change. Investigate failures, prevent regressions, protect tenant isolation, and report validation results accurately.

A successful build does not establish functional correctness, security correctness, or regression safety.

Use existing repository tools whenever possible. Do not introduce unnecessary testing infrastructure.

## 2. Project References

Before testing, consult applicable repository guidance:

- `AGENTS.md`
- `../../patterns/security/permissioned-feature-boundary.md`
- `../../decisions/INDEX.md`
- `../../decisions/006-authorization-and-forward-only-security.md`

Follow the Pattern Index and Decision Index when selecting implementation-specific validation requirements.

Do not assume documentation is accurate when repository code contradicts it. Report discrepancies.

## 3. Available Validation Commands

### Baseline Verification

```powershell
npm.cmd run verify
```

The baseline verification currently:

1. Confirms `AGENTS.md` exists.
2. Verifies sidebar destinations in `src/components/layout/sidebarConfig.js` are registered in `src/routes/routeConfig.jsx`.
3. Verifies the permission contract.
4. Verifies security-header configuration.
5. Runs the Vitest suite.
6. Runs linting.
7. Runs the production build.

### Unit and UI Tests

```powershell
npm.cmd run test
```

Workbench uses Vitest for unit and UI behavior testing.

Existing coverage includes shared authorization behavior and Work Order action visibility.

### Security and Supabase

Repository security-boundary checks:

```powershell
npm.cmd run check:security
```

Live Supabase RLS checks:

```powershell
npm.cmd run check:supabase
```

On Windows, prefer `scripts/run-security-check.ps1` when the security check requires short-lived credentials or the Windows system certificate store. Verify that commands and scripts exist before execution. If repository configuration differs from these instructions, report the discrepancy.

Never claim a command succeeded without executing it and observing successful results.

## 4. Change Impact Analysis

Before selecting tests:

1. Identify modified files.
2. Determine the behavior changed.
3. Identify affected imports and dependencies.
4. Identify downstream consumers.
5. Determine whether shared functionality is affected.
6. Identify relevant existing tests.
7. Identify authorization and data-access implications.
8. Classify the change's risk.

Consider impacts involving:

- Shared components and utilities.
- Routing and navigation.
- Authentication and authorization.
- Supabase queries and policies.
- Organization-level data access.
- State management.
- Business logic.
- Forms and validation.
- File storage and attachments.
- Cross-module workflows.

Expand testing when changes affect shared functionality.

Do not classify risk based solely on the number of changed files or lines.

## 5. Risk-Based Testing

### Low Risk

Examples:

- Static text changes.
- Minor styling adjustments.
- Nonfunctional visual refinements.

Required validation:

- Baseline verification.
- Relevant existing tests when applicable.
- Affected behavior review.

Do not claim visual verification unless UI-capable tooling was actually used.

### Medium Risk

Examples:

- Component behavior changes.
- Form modifications.
- Filtering, sorting, or search changes.
- Navigation changes.
- Work Order interactions.
- Localized business logic changes.

Required validation:

- Baseline verification.
- Relevant Vitest tests.
- Regression testing.
- Positive and negative behavior checks where applicable.
- Dependent workflow validation.

### High Risk

Examples:

- Authentication or authorization changes.
- Supabase RLS policy changes.
- Organization-level data access.
- Database mutations.
- Shared data-access infrastructure.
- Protected file or attachment access.
- Cross-module business logic.
- Security-sensitive configuration.

Required validation:

- Baseline verification.
- Relevant unit and integration tests.
- Authorization boundary testing.
- Negative and unauthorized-path testing.
- Regression testing.
- Cross-organization isolation testing.
- Live security validation when the required environment and credentials are available.

### Risk Escalation

When risk classification is uncertain, use the higher reasonable classification.

Shared utilities, route guards, authorization logic, data-access layers, and shared state-management infrastructure must not automatically be classified as Low Risk.

Use risk to determine the necessary depth of validation, not to justify skipping relevant tests.

## 6. Behavioral and Regression Testing

Prioritize meaningful behavioral coverage for:

- Sidebar navigation.
- Hash and deep-link navigation.
- Panel search clearing.
- List selection and detail rendering.
- Work Orders tabs.
- Work Order action visibility.
- Responsive layout states.
- Form validation.
- Loading, empty, and error states.
- Authorization-dependent behavior.

Nested-route validation must cover generic `PanelView` pages and custom Work Orders pages.

Valid parent routes with unknown child IDs must preserve the application shell and render the shared detail-pane 404 state.

### Bug Fixes

For reproducible defects, use a test-first approach when practical:

1. Identify the original failure condition.
2. Create or update a regression test.
3. Confirm the test fails for the expected reason.
4. Implement the correction.
5. Confirm the regression test passes.
6. Run related tests.
7. Preserve the regression test.

If test-first validation is impractical, explain why.

Do not weaken assertions, remove meaningful tests, or change expected behavior merely to obtain passing results.

### Test Selection

Prefer:

1. Behavioral unit tests.
2. Component and integration tests.
3. End-to-end tests.
4. Manual verification using appropriate tools.

Choose the lowest test layer that adequately validates the behavior.

Use broader tests when lower-level tests cannot establish sufficient confidence.

Avoid implementation-detail snapshots that provide little regression protection.

## 7. Supabase and Tenant Security

Workbench is a multi-tenant application.

Security validation must protect organization boundaries and prevent unauthorized data access.

Test applicable permissions for:

- Unauthenticated users.
- Authenticated users.
- Organization members.
- Users belonging to other organizations.
- Read operations.
- Create operations.
- Update operations.
- Delete operations.
- Direct API requests.
- Manipulated record identifiers.
- Protected files and attachments.

A hidden or disabled UI action does not prove authorization enforcement.

Verify security at the appropriate database, storage, or server boundary.

### Test Data Isolation

When live database testing is required:

1. Use authorized development or test environments.
2. Use dedicated test identities and organizations.
3. Avoid production data.
4. Create uniquely identifiable test records.
5. Track created resources.
6. Clean up test records after execution.
7. Report cleanup failures.

Never perform destructive security tests against production data without explicit authorization.

Never expose credentials in source code, commits, logs, or `VITE_*` environment variables.

### TLS Security

Prefer secure certificate validation.

The following command is permitted only for controlled local diagnostics:

```powershell
node scripts/check-supabase-rls.mjs --insecure
```

Do not use insecure TLS as the default validation method.

Do not disable certificate verification in production or automated deployment pipelines.

If secure validation cannot run, report the environmental limitation.

## 8. Performance Considerations

Additional performance validation should be considered when changes affect:

- Database queries.
- Large list rendering.
- Search, sorting, or filtering.
- Data aggregation.
- Shared rendering paths.
- Frequently executed workflows.
- Network request behavior.

Look for:

- Excessive rerendering.
- Repeated database queries.
- Unnecessary network requests.
- Inefficient processing.
- Significant user-visible slowdowns.

Do not claim measured performance improvements without measurements.

Performance testing is not required for unrelated low-risk changes.

## 9. Failure Investigation

When a test fails:

1. Capture the failing command and relevant output.
2. Identify the failing test or operation.
3. Determine whether the failure is introduced, pre-existing, environmental, or unconfirmed.
4. Investigate the likely root cause.
5. Correct issues introduced by the current change when within scope.
6. Rerun affected tests.
7. Rerun baseline verification after relevant code corrections.
8. Report unresolved failures.

### Controlled Retries

Do not repeatedly execute an unchanged failing test without a diagnostic reason.

Before retrying, identify what new information the execution is expected to provide.

If repeated attempts provide no additional information, stop and report the blocker.

Do not enter an unproductive repair-and-retest loop.

### Flaky Tests

Do not classify a failure as flaky merely because it is intermittent.

Investigate:

- Timing assumptions.
- Shared state.
- Test isolation.
- Environmental instability.
- Nondeterministic inputs.
- Actual application defects.

Document evidence supporting a flaky-test classification.

Never conceal failures or disable tests without justification.

## 10. Test Quality

Tests should:

- Verify observable behavior.
- Use deterministic inputs.
- Cover meaningful positive and negative paths.
- Avoid unnecessary external dependencies.
- Use isolated fixtures.
- Avoid excessive mocking.
- Validate authorization at the appropriate boundary.
- Remain maintainable as Workbench grows.

Prefer existing testing infrastructure.

When important coverage is missing, add tests when practical and within scope.

Otherwise, document the coverage gap.

Do not create tests solely to increase test counts or coverage percentages.

## 11. Validation Evidence

All validation claims must be supported by observed execution evidence.

Record when applicable:

- Commands executed.
- Test suites executed.
- Test counts when available.
- Relevant errors.
- Security results.
- Manual validation steps.
- Environmental limitations.

Never invent:

- Test results.
- Coverage percentages.
- Command output.
- Successful execution.
- Security verification.
- Manual UI validation.

Do not claim live Supabase validation without executed evidence.

## 12. Confidence Classification

### High Confidence

- All required checks completed successfully.
- Relevant behavioral tests passed.
- Required security checks passed.
- No material unresolved coverage gaps.

### Medium Confidence

- Executed checks passed.
- Some noncritical validation remains incomplete.
- Remaining gaps are understood and documented.

### Low Confidence

- Important checks could not be executed.
- Required security validation is unavailable.
- Significant coverage gaps exist.
- Results are inconclusive.

Confidence describes the completeness and reliability of validation, not merely whether executed tests passed.

## 13. Completion Criteria

### Validated

Use only when:

- Required checks passed.
- Applicable regression tests passed.
- Required security checks passed.
- No material unresolved validation gaps remain.
- No known defects introduced by the change remain.

### Partially Validated

Use when:

- Executed checks passed.
- Some required validation could not be completed.
- Missing checks and associated risks are documented.
- No observed defect has been concealed.

### Failed Validation

Use when:

- A required check identifies a defect.
- A regression is confirmed.
- A security violation is identified.
- A relevant failure remains unresolved and prevents successful validation.

A pre-existing or environmental failure must be classified accurately. Do not automatically attribute it to the current change.

If a required check cannot run, do not classify it as passed.

Do not equate successful compilation with successful application validation.

## 14. Final Report

Keep reporting concise and proportional to risk.

Use the following format:

```text
Validation Results

Change: <summary>
Risk: Low | Medium | High
Reason: <risk explanation>

Checks:
- verify: PASS | FAIL | NOT RUN
- Vitest: PASS | FAIL | NOT RUN
- Security/RLS: PASS | FAIL | NOT REQUIRED | NOT RUN
- Regression: PASS | FAIL | NOT REQUIRED | NOT RUN
- UI validation: PASS | FAIL | NOT REQUIRED | NOT RUN

Evidence:
- Commands executed
- Relevant test scope
- Meaningful observations

Failures:
- Type: Functional | Security | Regression | Performance | Infrastructure
- Origin: Introduced | Pre-existing | Environmental | Unconfirmed

Gaps:
- Classification
- Reason
- Impact
- Recommended next step

Confidence: High | Medium | Low

Conclusion:
Validated | Partially Validated | Failed Validation
```

Omit unnecessary detail when no failures or gaps exist.

Always disclose meaningful limitations.

## 15. Operating Principles

1. Test according to behavioral impact and risk.
2. Protect authorization boundaries and tenant isolation.
3. Prefer existing repository tooling.
4. Use test-first regression procedures for reproducible defects.
5. Investigate failures before retrying.
6. Avoid unnecessary testing infrastructure.
7. Preserve deterministic and maintainable tests.
8. Require evidence for validation claims.
9. Report incomplete validation accurately.
10. Never declare unverified behavior successfully tested.

The objective is reliable, efficient, autonomous validation of Workbench changes without unnecessary complexity, wasted execution, or unsupported claims.
