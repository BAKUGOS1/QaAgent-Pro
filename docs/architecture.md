# Architecture

QaAgent-Pro is a deterministic, local-first QA framework. The CLI selects an explicit mode, configuration is validated, safety determines read-only or mutation eligibility, and later phases will execute CRM-specific Playwright playbooks.

Phase 1 intentionally stops before browser execution.

Phase 2 adds a deterministic human-QA layer and browser evidence foundation. The reasoning layer is a pipeline of typed roles rather than an autonomous model loop.

## Requirement sources

- **Confirmed blueprint requirement:** explicitly approved in the PRD/TDD or Excalidraw.
- **Observed application behaviour:** evidence captured from the running application.
- **Needs product confirmation:** ambiguous, inferred, conflicting, or undocumented behaviour.

These sources remain distinct throughout finding classification and reporting.

## Dependency direction

```text
CLI
  -> configuration and safety
  -> mission planner and risk analyst
  -> deterministic playbooks
  -> executor, page objects and browser engine
  -> defect verifier and evidence
  -> release judge, findings and Excel reporting
```

Reporting and shared domain types must not import browser automation. Safety policy must remain usable without launching Playwright.
