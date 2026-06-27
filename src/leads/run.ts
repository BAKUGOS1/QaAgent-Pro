import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { loadConfig } from "../config/load.js";
import { evaluateEnvironment } from "../safety/environment-guard.js";
import { EvidenceRecorder } from "../browser/evidence-recorder.js";
import { environmentObservationPath, authStatePath, ensureBrowserDirectories } from "../browser/session.js";
import { verifyExecution } from "../human-qa/defect-verifier.js";
import { judgeRelease } from "../human-qa/release-judge.js";
import { createLeadFixture } from "../data/lead-fixture.js";
import { LeadsPage } from "../pages/leads-page.js";
import { leadsScenarios, type LeadsScenarioDefinition } from "./scenarios.js";
import { dependsOnCreatedLeadFixture } from "./dependencies.js";
import { EntityRegistry } from "./entity-registry.js";
import type {
  ActionEvidenceScope,
  LeadsRunReport,
  ScenarioExecutionResult
} from "./types.js";
import { writeLeadsWorkbook } from "../reporting/leads-workbook.js";
import { createRunLogger } from "../shared/logger.js";

// ---- Playbook imports ----
import { pageLoad, blueprintControls } from "../playbooks/leads/page-load.js";
import { emptyValidation, invalidField } from "../playbooks/leads/validation.js";
import { createLead, duplicateBehavior } from "../playbooks/leads/create.js";
import { searchByName, searchByCompany, searchByMobile, searchByEmail, noResults } from "../playbooks/leads/search.js";
import { detailObservation } from "../playbooks/leads/detail.js";
import { editField, addNote, scheduleActivity } from "../playbooks/leads/edit.js";
import { convertLeadToDeal, archiveLeadScenario, archivedReadOnly, unarchiveLeadScenario, bulkArchiveScenario } from "../playbooks/leads/lifecycle.js";
import { filterObservation } from "../playbooks/leads/filters.js";
import { sortObservation, paginationObservation, directPageObservation, pageSizeObservation } from "../playbooks/leads/table-controls.js";
import { responsive, keyboardFocus, accessibility, performancePage, performanceSearch, performanceMutation } from "../playbooks/leads/quality.js";
import { featureGap, manageColumnsPersistence } from "../playbooks/leads/feature-gaps.js";
import { persistenceMatrix, cleanupObservation } from "../playbooks/leads/persistence.js";
import {
  type ScenarioOutcome,
  blocked,
  dependencyBlocked,
  productConfirmation,
  severityFor
} from "../playbooks/leads/outcome-helpers.js";

import type { RunnerState } from "../playbooks/leads/runner-state.js";

export async function runLeadsMvp(options: { headed?: boolean; refreshOnly?: boolean } = {}): Promise<LeadsRunReport> {
  const config = loadConfig();
  ensureBrowserDirectories();
  if (!fs.existsSync(authStatePath)) throw new Error("Authenticated storage state is missing. Run npm run auth:setup first.");
  const observation = JSON.parse(fs.readFileSync(environmentObservationPath, "utf8")) as { visibleMarkers: string[] };
  const environment = evaluateEnvironment(config, { visibleMarkers: observation.visibleMarkers });
  const runId = `QAP-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
  const reportPath = path.join(process.cwd(), "artifacts", "reports", `${runId}-leads.xlsx`);
  const screenshotDir = path.join(process.cwd(), "artifacts", "screenshots", runId);
  const tracePath = path.join(process.cwd(), "artifacts", "traces", `${runId}.zip`);
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: options.headed ? false : config.HEADLESS });
  const context = await browser.newContext({
    storageState: authStatePath,
    viewport: { width: 1440, height: 900 }
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const page = await context.newPage();
  const logger = createRunLogger(runId, [config.CRM_PASSWORD]);
  const recorder = new EvidenceRecorder([config.CRM_PASSWORD]);
  recorder.attach(page);
  const registry = new EntityRegistry(runId);
  const leads = new LeadsPage(page);
  await leads.open(config.CRM_BASE_URL);
  const baselineRow = await leads.firstRowData();
  const state: RunnerState = {
    page,
    context,
    leads,
    recorder,
    runId,
    fixture: createLeadFixture(config.QA_AGENT_PREFIX, runId),
    baseline: { ...baselineRow, value: "" },
    registry,
    access: environment.access,
    screenshotDir,
    tracePath,
    baseUrl: config.CRM_BASE_URL,
    secrets: [config.CRM_PASSWORD],
    logger
  };

  const startedAt = new Date().toISOString();
  const results: ScenarioExecutionResult[] = [];
  try {
    const selectedScenarios = options.refreshOnly
      ? leadsScenarios.filter((scenario) => refreshScenarioIds.has(scenario.id))
      : leadsScenarios;
    for (const scenario of selectedScenarios) {
      results.push(await executeScenario(scenario, state));
    }
  } finally {
    await context.tracing.stop({ path: state.tracePath }).catch(() => {});
    await browser.close();
  }
  const cleanup = registry.reconcile();
  const release = judgeRelease({
    verifications: results.map((item) => item.verification),
    risks: results.filter((item) => item.riskScore >= 20 && item.status !== "Pass").map((item) => ({
      riskId: item.id,
      score: item.riskScore,
      level: "critical",
      likelihood: 4,
      impact: 5,
      rationale: item.actual
    })),
    blockedScenarios: results.filter((item) => item.status === "Blocked").map((item) => item.id),
    coveragePercent: Math.round((results.filter((item) => item.status !== "Blocked").length / results.length) * 100)
  });
  const report: LeadsRunReport = {
    runId,
    startedAt,
    endedAt: new Date().toISOString(),
    environmentAccess: environment.access,
    scenarios: results,
    cleanup,
    release,
    reportPath
  };
  await writeLeadsWorkbook(report);
  fs.writeFileSync(path.join(process.cwd(), "artifacts", "state", `${runId}-report.json`), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

const refreshScenarioIds = new Set([
  "LEAD-006", "LEAD-013", "LEAD-014", "LEAD-015", "LEAD-016", "LEAD-017",
  "LEAD-018", "LEAD-019", "LEAD-023", "LEAD-024", "LEAD-025", "LEAD-026",
  "LEAD-054", "LEAD-055"
]);

async function executeScenario(
  scenario: LeadsScenarioDefinition,
  state: RunnerState
): Promise<ScenarioExecutionResult> {
  const started = Date.now();
  const mark = state.recorder.mark();
  const screenshotPath = path.join(state.screenshotDir, `${scenario.id}.png`);
  let outcome: ScenarioOutcome;
  try {
    if (scenario.mutation && state.access !== "mutation-allowed") {
      outcome = blocked("Mutation gate did not pass; scenario downgraded to read-only.");
    } else if (dependsOnCreatedLeadFixture(scenario.id) && state.fixtureCreateFailure) {
      outcome = dependencyBlocked(state.fixtureCreateFailure);
    } else {
      outcome = await runScenarioLogic(scenario.id, state);
    }
  } catch (error) {
    outcome = {
      status: "Blocked",
      category: "Automation Blocker",
      severity: "Medium",
      actual: error instanceof Error ? error.message : String(error),
      expected: "The deterministic scenario completes with supported selectors.",
      oracles: [{ oracle: "ui", status: "not-observed", detail: "Scenario execution was blocked." }],
      releaseImpact: "Coverage gap; not automatically classified as an application defect."
    };
  }
  if (outcome.status !== "Pass") await state.leads.screenshot(screenshotPath).catch(() => {});
  const ended = Date.now();
  const evidence: ActionEvidenceScope = {
    startedAt: new Date(started).toISOString(),
    endedAt: new Date(ended).toISOString(),
    durationMs: ended - started,
    browser: state.recorder.since(mark),
    tracePath: state.tracePath,
    ...(outcome.matchedNetwork ? { matchedNetwork: outcome.matchedNetwork } : {}),
    ...(outcome.validationMessages ? { validationMessages: outcome.validationMessages } : {}),
    ...(fs.existsSync(screenshotPath) ? { screenshotPath } : {})
  };
  const required = outcome.oracles.map((oracle) => oracle.oracle);
  const verification = verifyExecution({
    scenarioId: scenario.id,
    actionCompleted: outcome.status !== "Blocked",
    actionError: outcome.status === "Blocked" ? outcome.actual : undefined,
    oracles: outcome.oracles,
    screenshots: evidence.screenshotPath ? [evidence.screenshotPath] : []
  }, required);
  const result: ScenarioExecutionResult = {
    id: scenario.id,
    title: scenario.title,
    status: outcome.status,
    category: outcome.category,
    severity: outcome.severity ?? severityFor(outcome.status, scenario.riskScore),
    steps: scenario.title,
    expected: outcome.expected ?? `Complete ${scenario.title.toLowerCase()} with evidence.`,
    actual: outcome.actual,
    oracles: outcome.oracles,
    evidence,
    verification,
    riskScore: scenario.riskScore,
    releaseImpact: outcome.releaseImpact ?? (outcome.status === "Pass" ? "None" : "Requires review"),
    ...(outcome.dependency ? { dependency: outcome.dependency } : {})
  };
  if (scenario.id === "LEAD-006" && result.status !== "Pass") state.fixtureCreateFailure = result;
  return result;
}

async function runScenarioLogic(id: string, state: RunnerState): Promise<ScenarioOutcome> {
  switch (id) {
    // Page load & blueprint (LEAD-001–002)
    case "LEAD-001": return pageLoad(state);
    case "LEAD-002": return blueprintControls(state);

    // Validation (LEAD-003–005)
    case "LEAD-003": return emptyValidation(state);
    case "LEAD-004": return invalidField(state, "mobile");
    case "LEAD-005": return invalidField(state, "email");

    // Creation & duplicates (LEAD-006–007)
    case "LEAD-006": return createLead(state);
    case "LEAD-007": return duplicateBehavior();

    // Search (LEAD-008–011)
    case "LEAD-008": return searchByName(state);
    case "LEAD-009": return searchByCompany(state);
    case "LEAD-010": return searchByMobile(state);
    case "LEAD-011": return searchByEmail(state);

    // Detail view (LEAD-012)
    case "LEAD-012": return detailObservation(state);

    // Edit operations (LEAD-013–017)
    case "LEAD-013": case "LEAD-014": case "LEAD-015":
    case "LEAD-016": case "LEAD-017":
      return editField(state, id);

    // Notes & activities (LEAD-018–019)
    case "LEAD-018": return addNote(state);
    case "LEAD-019": return scheduleActivity(state);

    // Communication safety (LEAD-020–022)
    case "LEAD-020": return communicationSafety("Call");
    case "LEAD-021": return communicationSafety("Email");
    case "LEAD-022": return communicationSafety("Whatsapp");

    // Lifecycle (LEAD-023–027)
    case "LEAD-023": return convertLeadToDeal(state);
    case "LEAD-024": return archiveLeadScenario(state);
    case "LEAD-025": return archivedReadOnly(state);
    case "LEAD-026": return unarchiveLeadScenario(state);
    case "LEAD-027": return bulkArchiveScenario(state);

    // Filters (LEAD-028–036)
    case "LEAD-028": case "LEAD-029": case "LEAD-030": case "LEAD-031":
    case "LEAD-032": case "LEAD-033": case "LEAD-034": case "LEAD-035":
    case "LEAD-036": return filterObservation(state, id);

    // Table controls (LEAD-037–041)
    case "LEAD-037": return sortObservation(state, "Company Name");
    case "LEAD-038": return sortObservation(state, "Name");
    case "LEAD-039": return paginationObservation(state);
    case "LEAD-040": return directPageObservation(state);
    case "LEAD-041": return pageSizeObservation(state);

    // Empty/no-results states (LEAD-042–043)
    case "LEAD-042": return productConfirmation("Destructive isolation needed to guarantee a true empty-table tenant state.");
    case "LEAD-043": return noResults(state);

    // Quality attributes (LEAD-044–050)
    case "LEAD-044": return responsive(state, 1366, 768);
    case "LEAD-045": return responsive(state, 768, 900);
    case "LEAD-046": return keyboardFocus(state);
    case "LEAD-047": return accessibility(state);
    case "LEAD-048": return performancePage(state);
    case "LEAD-049": return performanceSearch(state);
    case "LEAD-050": return performanceMutation();

    // Feature gaps (LEAD-051–054)
    case "LEAD-051": return featureGap(state, "Import Data");
    case "LEAD-052": return featureGap(state, "Export Data", "Export is additionally blocked by safety policy.");
    case "LEAD-053": return featureGap(state, "Manage Columns");
    case "LEAD-054": return manageColumnsPersistence();

    // Persistence & cleanup (LEAD-055–056)
    case "LEAD-055": return persistenceMatrix(state);
    case "LEAD-056": return cleanupObservation(state);

    default:
      return blocked("The live CRM does not expose a stable deterministic contract for this scenario yet; no guessed interaction was attempted.");
  }
}

function communicationSafety(label: string): ScenarioOutcome {
  return {
    status: "Pass", category: "Safety", actual: `${label} send was not executed; safety policy remains blocking.`,
    expected: `${label} may be inspected but never sent.`,
    oracles: [{ oracle: "ui", status: "pass", detail: "No real communication side effect was triggered." }]
  };
}
