# QaAgent-Pro Agent Rules

## Architecture rules

- This repository is a standalone TypeScript and Playwright project. Do not import source code from the legacy QaAgent repository.
- Keep dependencies flowing from orchestration into domain modules: `cli -> config/safety/playbooks -> browser/pages/validators -> evidence/reporting`.
- Browser actions must be expressed through deterministic CRM playbooks and page objects. Random crawling, unrestricted exploration, and model-selected browser actions are prohibited.
- Keep the three requirement sources separate:
  1. confirmed blueprint requirements;
  2. observed application behaviour;
  3. items needing product confirmation.
- A difference between sources is not automatically a functional bug. Classify it using evidence and confidence.
- Human-QA reasoning is implemented as deterministic roles over typed evidence: Mission Planner, Risk Analyst, Executor, Defect Verifier, and Release Judge.
- Only the Executor may operate Playwright. Planning and verification roles cannot click or mutate the application.
- Natural-language missions must compile to enumerated supported actions before execution. Free-form model-selected actions are prohibited.
- The Leads runner must emit one result for every `LEAD-001` through `LEAD-056`; unsupported live contracts are `Blocked`, never silently skipped.
- External LLM integrations and autonomous destructive actions remain out of scope.

## Safety restrictions

- Never hardcode credentials, tokens, cookies, tenant secrets, or customer data.
- Load CRM credentials only from local environment files. `.env` and `.auth` must remain untracked.
- Before any mutation, require:
  - `CRM_ENVIRONMENT=staging`;
  - allowlisted hostname;
  - allowlisted tenant;
  - allowlisted dedicated QA account;
  - a visible staging/test marker when marker verification is configured.
- If any mutation gate fails, switch to read-only mode. Never weaken the gate to make a test pass.
- Archive, delete, export, real messages, calls, payments, billing changes, invitations, and bulk changes require explicit policy authorization.
- Delete requires staging verification plus both `ALLOW_DELETE=true` and `ALLOW_DESTRUCTIVE=true`.
- Redact passwords, tokens, cookies, authorization headers, and sensitive URL values from all errors, logs, reports, and debug output.
- Track every created entity. Restore archived fixtures and report unresolved cleanup.

## Required commands

```bash
npm install
npx playwright install chromium
npm run config:check
npm run typecheck
npm run lint
npm run test:unit
npm run test:workbook
npm run test:discovery
npm run qa:mission -- --file config/blueprint/sample-mission.json
npm run auth:setup
npm run quality:gate
```

## Verification checklist

- TypeScript compiles with strict checks.
- ESLint reports no errors.
- Framework unit tests pass before CRM testing.
- Product-input checksums match `docs/product-inputs/MANIFEST.md`.
- The workbook contains exactly these first sheets in order:
  1. Bug Report
  2. Summary
  3. UX Issues
  4. Feature Gaps
  5. Refresh Persistence
  6. Next Build Backlog
  7. Test Execution
  8. Evidence Log
  9. Run Metadata
- Screenshot embedding and workbook reopening are tested.
- Secret scanning and redaction tests pass.
- Playwright can discover tests without opening the CRM.
- Human-QA missions validate and expand deterministically.
- Suspected defects are independently attributed before reporting.
- No CRM mutation occurs during framework verification.

## Definition of done

A change is done only when it follows the architecture and safety rules, includes proportionate tests, passes `npm run quality:gate`, does not expose secrets, preserves the workbook contract, and updates documentation when it changes an interface or operating rule.

For the Full Leads MVP, done means all 56 scenario results are present in the Excel workbook, staging gates are enforced, touched entities are reconciled, and no random crawler, external LLM API, real communication, sensitive export, or delete action is implemented.
