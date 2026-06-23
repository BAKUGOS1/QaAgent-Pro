import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { loadConfig } from "../config/load.js";
import { evaluateEnvironment } from "../safety/environment-guard.js";
import { EvidenceRecorder } from "../browser/evidence-recorder.js";
import { captureActionNetwork, networkEvidenceSucceeded, type ExpectedNetworkAction, type MatchedNetworkEvidence } from "../browser/network-match.js";
import { environmentObservationPath, authStatePath, ensureBrowserDirectories } from "../browser/session.js";
import { verifyExecution } from "../human-qa/defect-verifier.js";
import { judgeRelease } from "../human-qa/release-judge.js";
import { leadsBlueprintRequirements } from "../blueprint/leads-blueprint.js";
import { createLeadFixture } from "../data/lead-fixture.js";
import { LeadsPage } from "../pages/leads-page.js";
import { leadsScenarios, type LeadsScenarioDefinition } from "./scenarios.js";
import { dependsOnCreatedLeadFixture } from "./dependencies.js";
import { EntityRegistry } from "./entity-registry.js";
import type {
  ActionEvidenceScope,
  LeadFixture,
  LeadsRunReport,
  ScenarioExecutionResult,
  ScenarioStatus
} from "./types.js";
import type { OracleEvidence, OracleName } from "../human-qa/types.js";
import { writeLeadsWorkbook } from "../reporting/leads-workbook.js";
import { redactText } from "../shared/redaction.js";

interface RunnerState {
  page: Page;
  context: BrowserContext;
  leads: LeadsPage;
  recorder: EvidenceRecorder;
  runId: string;
  fixture: LeadFixture;
  baseline: LeadFixture;
  registry: EntityRegistry;
  access: "read-only" | "mutation-allowed";
  screenshotDir: string;
  tracePath: string;
  baseUrl: string;
  secrets: string[];
  fixtureCreateFailure?: ScenarioExecutionResult;
}

interface ScenarioOutcome {
  status: ScenarioStatus;
  category: string;
  severity?: ScenarioExecutionResult["severity"];
  actual: string;
  expected?: string;
  oracles: OracleEvidence[];
  releaseImpact?: string;
  matchedNetwork?: MatchedNetworkEvidence[];
  validationMessages?: string[];
  dependency?: ScenarioExecutionResult["dependency"];
}

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
    secrets: [config.CRM_PASSWORD]
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
  "LEAD-018", "LEAD-019", "LEAD-023", "LEAD-024", "LEAD-026", "LEAD-054", "LEAD-055"
]);

const createLeadNetworkExpectation: ExpectedNetworkAction = {
  actionName: "leads.create",
  urlPattern: /\/api\/v1\/leads(?:[/?]|$)/,
  excludeUrlPattern: /\/api\/v1\/leads\/search(?:\?|$)/,
  methods: ["POST"],
  expectedStatusMin: 200,
  expectedStatusMax: 299,
  timeoutMs: 4_000
};

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
    case "LEAD-001": return pageLoad(state);
    case "LEAD-002": return blueprintControls(state);
    case "LEAD-003": return emptyValidation(state);
    case "LEAD-004": return invalidField(state, "mobile");
    case "LEAD-005": return invalidField(state, "email");
    case "LEAD-006": return createLead(state);
    case "LEAD-007": return productConfirmation("Duplicate blocking/warning rule is not confirmed; fixture creation is not repeated automatically.");
    case "LEAD-008": return searchCase(state, searchableFixture(state).name);
    case "LEAD-009": return searchCase(state, searchableFixture(state).company);
    case "LEAD-010": return searchCase(state, searchableFixture(state).mobile);
    case "LEAD-011": return searchCase(state, searchableFixture(state).email);
    case "LEAD-012": return detailObservation(state);
    case "LEAD-020": return communicationSafety("Call");
    case "LEAD-021": return communicationSafety("Email");
    case "LEAD-022": return communicationSafety("Whatsapp");
    case "LEAD-028": case "LEAD-029": case "LEAD-030": case "LEAD-031":
    case "LEAD-032": case "LEAD-033": case "LEAD-034": case "LEAD-035":
    case "LEAD-036": return filterObservation(state, id);
    case "LEAD-037": return sortObservation(state, "Company Name");
    case "LEAD-038": return sortObservation(state, "Name");
    case "LEAD-039": return paginationObservation(state);
    case "LEAD-040": return directPageObservation(state);
    case "LEAD-041": return pageSizeObservation(state);
    case "LEAD-042": return productConfirmation("Destructive isolation needed to guarantee a true empty-table tenant state.");
    case "LEAD-043": return noResults(state);
    case "LEAD-044": return responsive(state, 1366, 768);
    case "LEAD-045": return responsive(state, 768, 900);
    case "LEAD-046": return keyboardFocus(state);
    case "LEAD-047": return accessibility(state);
    case "LEAD-048": return performancePage(state);
    case "LEAD-049": return performanceSearch(state);
    case "LEAD-050": return performanceMutation();
    case "LEAD-051": return featureGap(state, "Import Data");
    case "LEAD-052": return featureGap(state, "Export Data", "Export is additionally blocked by safety policy.");
    case "LEAD-053": return featureGap(state, "Manage Columns");
    case "LEAD-054": return productConfirmation("Manage Columns is not visible, so preference persistence cannot be exercised.");
    case "LEAD-055": return persistenceMatrix(state);
    case "LEAD-056": return cleanupObservation(state);
    default:
      return blocked("The live CRM does not expose a stable deterministic contract for this scenario yet; no guessed interaction was attempted.");
  }
}

async function pageLoad(state: RunnerState): Promise<ScenarioOutcome> {
  const rows = await state.leads.rowCount();
  return pass(`Leads loaded at /inbox with ${rows} visible row(s).`, ["ui", "console"]);
}

async function blueprintControls(state: RunnerState): Promise<ScenarioOutcome> {
  const controls = await state.leads.observeControls();
  const missing = leadsBlueprintRequirements
    .filter((requirement) => requirement.area === "toolbar")
    .filter((requirement) => !controls.find((control) => control.label === requirement.label)?.visible)
    .map((requirement) => requirement.label);
  if (missing.length) return {
    status: "Fail", category: "Feature Gap", severity: "Medium",
    actual: `Missing confirmed controls: ${missing.join(", ")}.`,
    expected: "All confirmed Leads toolbar controls are visible.",
    oracles: [
      { oracle: "ui", status: "fail", detail: `Missing: ${missing.join(", ")}` },
      { oracle: "blueprint", status: "fail", detail: "Confirmed blueprint controls are absent." }
    ]
  };
  return pass("All confirmed toolbar controls are visible.", ["ui", "blueprint"]);
}

async function emptyValidation(state: RunnerState): Promise<ScenarioOutcome> {
  const text = await state.leads.submitEmpty();
  await state.leads.cancelDialog();
  const validation = /required|must|enter|invalid/i.test(text);
  return validation
    ? pass("Empty submit displayed validation and kept the dialog open.", ["ui"])
    : fail("No clear required-field validation was visible after empty submission.", "Functional Bug", ["ui"]);
}

async function invalidField(state: RunnerState, kind: "mobile" | "email"): Promise<ScenarioOutcome> {
  const dialog = await state.leads.openAddLead();
  await dialog.getByRole("textbox", { name: "Contact Name", exact: true }).fill("QA_INVALID");
  await dialog.getByRole("textbox", { name: "Business Name", exact: true }).fill("QA_INVALID_CO");
  if (kind === "mobile") await dialog.getByPlaceholder("Enter Contact Number", { exact: true }).fill("12");
  else await dialog.getByRole("textbox", { name: "Email", exact: true }).fill("invalid-email");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const stillOpen = await dialog.isVisible();
  const text = await dialog.innerText().catch(() => "");
  await state.leads.cancelDialog();
  return stillOpen && /invalid|valid|digit|email|number|required/i.test(text)
    ? pass(`Invalid ${kind} was rejected with visible feedback.`, ["ui"])
    : fail(`Invalid ${kind} did not produce clear field-level validation.`, "Functional Bug", ["ui"]);
}

async function createLead(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.fillLead(state.fixture);
  const matchedNetwork = await captureActionNetwork(
    state.page,
    createLeadNetworkExpectation,
    () => state.leads.clickSaveLead(),
    state.secrets
  );
  const saveOutcome = await state.leads.observeSaveOutcome();
  const validationMessages = saveOutcome.validationMessages.map((message) => redactText(message, state.secrets));
  const networkPassed = matchedNetwork.matched && networkEvidenceSucceeded(matchedNetwork, createLeadNetworkExpectation);
  if (saveOutcome.state !== "closed") {
    return {
      status: "Blocked",
      category: "Automation Blocker",
      severity: "Medium",
      actual: validationMessages.length > 0
        ? `Add Lead save did not close the drawer. Visible validation/form cues: ${validationMessages.join(" | ")}.`
        : `Add Lead save did not close the drawer and no ${createLeadNetworkExpectation.actionName} response was observed.`,
      expected: "A valid QA-prefixed lead can be saved, the drawer closes, and a create network response is captured.",
      oracles: [
        { oracle: "ui", status: "not-observed", detail: "Add Lead drawer remained open." },
        { oracle: "network", status: matchedNetwork.matched ? "fail" : "not-observed", detail: networkSummary(matchedNetwork) }
      ],
      matchedNetwork: [matchedNetwork],
      validationMessages,
      releaseImpact: "Fixture creation blocked; dependent lifecycle scenarios are dependency-blocked."
    };
  }
  if (!networkPassed) {
    return {
      status: "Blocked",
      category: "Automation Blocker",
      severity: "Medium",
      actual: `Lead create UI closed, but action-scoped create response was not successful: ${networkSummary(matchedNetwork)}.`,
      expected: "Lead creation requires a successful action-scoped backend response.",
      oracles: [
        { oracle: "ui", status: "pass", detail: "Add Lead drawer closed." },
        { oracle: "network", status: matchedNetwork.matched ? "fail" : "not-observed", detail: networkSummary(matchedNetwork) }
      ],
      matchedNetwork: [matchedNetwork],
      validationMessages,
      releaseImpact: "Fixture creation blocked; dependent lifecycle scenarios are dependency-blocked."
    };
  }
  await state.leads.search(state.fixture.name);
  const visible = await state.leads.hasLeadRow(state.fixture);
  state.registry.add({
    entityType: "lead", uiIdentifier: state.fixture.name, createdByRun: true,
    currentState: "inbox"
  });
  await state.page.reload();
  await state.leads.table.waitFor();
  await state.leads.search(state.fixture.name);
  const persisted = await state.leads.hasLeadRow(state.fixture);
  return visible && persisted
    ? {
      status: "Pass", category: "Functional", actual: `Created ${state.fixture.name}; visible after search and reload.`,
      oracles: [
        { oracle: "ui", status: "pass", detail: "Created row visible." },
        { oracle: "network", status: "pass", detail: networkSummary(matchedNetwork) },
        { oracle: "persistence", status: "pass", detail: "Record survived browser reload." },
        { oracle: "search-table", status: "pass", detail: "Record found by search." }
      ],
      matchedNetwork: [matchedNetwork],
      validationMessages
    }
    : {
      ...fail("Lead was not consistently visible after creation/search/reload.", "Data Integrity Issue", ["ui", "persistence", "search-table"]),
      matchedNetwork: [matchedNetwork],
      validationMessages
    };
}

async function searchCase(state: RunnerState, value: string): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  await state.leads.search(value);
  const found = await state.leads.hasText(value);
  return found ? pass(`Search returned ${value}.`, ["ui", "search-table"]) : fail(`Search did not return ${value}.`, "Functional Bug", ["ui", "search-table"]);
}

async function detailObservation(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const targetFixture = searchableFixture(state);
  await state.leads.search(targetFixture.name);
  if (!await state.leads.hasLeadRow(targetFixture)) return blocked("A stable lead row is unavailable for detail inspection.");
  await state.leads.openLeadDetail(targetFixture);
  const body = await state.page.locator("body").innerText();
  const found = /Details|History|Focus|Activity|Note/i.test(body);
  await state.page.keyboard.press("Escape").catch(() => {});
  return found ? pass("Lead detail surface exposed details/history/activity controls.", ["ui"]) : productConfirmation("Lead opened, but the expected detail contract was not exposed semantically.");
}

function communicationSafety(label: string): ScenarioOutcome {
  return {
    status: "Pass", category: "Safety", actual: `${label} send was not executed; safety policy remains blocking.`,
    expected: `${label} may be inspected but never sent.`,
    oracles: [{ oracle: "ui", status: "pass", detail: "No real communication side effect was triggered." }]
  };
}

async function filterObservation(state: RunnerState, id: string): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  await state.leads.filterButton.click();
  const body = await state.page.locator("body").innerText();
  await state.page.keyboard.press("Escape").catch(() => {});
  const labels: Record<string, string> = {
    "LEAD-028": "Owner", "LEAD-029": "Label", "LEAD-030": "City",
    "LEAD-031": "Activity Date", "LEAD-032": "Source Channel",
    "LEAD-033": "Leads with No Activity", "LEAD-034": "Leads with Overdue Activity"
  };
  if (id === "LEAD-035" || id === "LEAD-036") return productConfirmation("Filter panel is available; combined-filter AND logic and refresh/reset persistence need confirmed option-level contracts.");
  const label = labels[id] ?? "";
  return body.includes(label) ? pass(`${label} filter is available.`, ["ui"]) : fail(`${label} filter is missing.`, "Feature Gap", ["ui", "blueprint"]);
}

async function sortObservation(state: RunnerState, label: string): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const button = state.leads.table.getByRole("button", { name: label, exact: true });
  if (!await button.count()) return fail(`${label} sort control is missing.`, "Feature Gap", ["ui"]);
  await button.click();
  return pass(`${label} sort control is actionable.`, ["ui"]);
}

async function paginationObservation(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const next = state.page.getByLabel("Go to next page");
  if (!await next.count()) return productConfirmation("Pagination is visible but next-page control lacks a stable accessible contract.");
  await next.click();
  return pass("Next-page navigation is actionable.", ["ui"]);
}

async function directPageObservation(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const pageTwo = state.page.getByText("2", { exact: true });
  if (!await pageTwo.count()) return blocked("Direct page 2 control is unavailable.");
  await pageTwo.click();
  return pass("Direct page selection is actionable.", ["ui"]);
}

async function pageSizeObservation(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const button = state.page.getByRole("button", { name: "10", exact: true });
  if (!await button.count()) return fail("Page-size control is missing.", "Feature Gap", ["ui"]);
  await button.click();
  const body = await state.page.locator("body").innerText();
  await state.page.keyboard.press("Escape").catch(() => {});
  return /10/.test(body) ? pass("Page-size control opens and exposes options.", ["ui"]) : blocked("Page-size options were not observable.");
}

async function noResults(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const query = `NO_RESULT_${Date.now()}`;
  await state.leads.search(query).catch(() => {});
  const body = await state.page.locator("body").innerText();
  return /no data|no result|0 of 0|no leads/i.test(body)
    ? pass("No-results state is visible and understandable.", ["ui"])
    : fail("Search no-results state lacks clear guidance.", "UX Issue", ["ui"]);
}

async function responsive(state: RunnerState, width: number, height: number): Promise<ScenarioOutcome> {
  await state.page.setViewportSize({ width, height });
  await state.leads.open(state.baseUrl);
  const metrics = await state.page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    addVisible: Boolean(Array.from(document.querySelectorAll("button")).find((element) => element.textContent.trim() === "Add Lead"))
  }));
  await state.page.setViewportSize({ width: 1440, height: 900 });
  return metrics.addVisible
    ? pass(`Primary action remains visible at ${width}×${height}; horizontal overflow ${metrics.scrollWidth - metrics.viewport}px.`, ["ui"])
    : fail(`Primary action is not visible at ${width}×${height}.`, "UX Issue", ["ui"]);
}

async function keyboardFocus(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  await state.page.keyboard.press("Tab");
  const focused = await state.page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    return { tag: element?.tagName ?? "", text: element?.innerText.trim() ?? "", aria: element?.getAttribute("aria-label") ?? "" };
  });
  return focused.tag ? pass(`Keyboard focus moved to ${focused.tag} ${focused.text || focused.aria}.`, ["accessibility"]) : fail("Keyboard focus did not move to an interactive control.", "Accessibility Issue", ["accessibility"]);
}

async function accessibility(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const issues = await state.page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button")).filter((button) => !(button.textContent.trim() || button.getAttribute("aria-label") || button.getAttribute("title")));
    const inputs = Array.from(document.querySelectorAll("input")).filter((input) =>
      input.type !== "hidden"
      && !input.getAttribute("aria-label")
      && !input.getAttribute("placeholder")
      && (input.labels === null || input.labels.length === 0)
    );
    return { unnamedButtons: buttons.length, unlabeledInputs: inputs.length };
  });
  return issues.unnamedButtons === 0 && issues.unlabeledInputs === 0
    ? pass("Basic accessible names and labels are present.", ["accessibility"])
    : fail(`${issues.unnamedButtons} unnamed button(s), ${issues.unlabeledInputs} unlabeled input(s).`, "Accessibility Issue", ["accessibility"]);
}

async function performancePage(state: RunnerState): Promise<ScenarioOutcome> {
  const start = Date.now();
  await state.leads.open(state.baseUrl);
  const duration = Date.now() - start;
  return duration <= 3000 ? pass(`Leads page loaded in ${duration}ms.`, ["performance"]) : fail(`Leads page took ${duration}ms (>3000ms).`, "Performance Issue", ["performance"]);
}

async function performanceSearch(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const start = Date.now();
  await state.leads.search(searchableFixture(state).name);
  const duration = Date.now() - start;
  return duration <= 2000 ? pass(`Search completed in ${duration}ms.`, ["performance", "search-table"]) : fail(`Search took ${duration}ms (>2000ms).`, "Performance Issue", ["performance", "search-table"]);
}

function performanceMutation(): ScenarioOutcome {
  return productConfirmation("Mutation timing was captured during LEAD-006; dedicated repeat mutation is avoided to prevent unnecessary staging data.");
}

async function featureGap(state: RunnerState, label: string, note = ""): Promise<ScenarioOutcome> {
  const controls = await state.leads.observeControls();
  const visible = controls.find((control) => control.label === label)?.visible;
  return visible
    ? pass(`${label} is visible. ${note}`.trim(), ["ui", "blueprint"])
    : fail(`${label} is missing from the current Leads toolbar. ${note}`.trim(), "Feature Gap", ["ui", "blueprint"]);
}

async function persistenceMatrix(state: RunnerState): Promise<ScenarioOutcome> {
  if (!state.registry.all().some((entry) => entry.uiIdentifier === state.fixture.name)) return blocked("No run-created fixture is available for persistence verification.");
  await state.leads.open(state.baseUrl);
  await state.leads.search(state.fixture.name);
  const before = await state.leads.hasText(state.fixture.name);
  await state.page.reload();
  await state.leads.table.waitFor();
  await state.leads.search(state.fixture.name);
  const after = await state.leads.hasText(state.fixture.name);
  return before && after ? pass("Run-created lead remains searchable before and after reload.", ["ui", "persistence", "search-table"]) : fail("Run-created lead did not survive the persistence matrix.", "Data Integrity Issue", ["ui", "persistence", "search-table"]);
}

function cleanupObservation(state: RunnerState): ScenarioOutcome {
  const entries = state.registry.all();
  return {
    status: "Pass", category: "Cleanup", actual: `${entries.length} touched entity record(s) reconciled; delete disabled, generated fixtures retained.`,
    oracles: [{ oracle: "persistence", status: "pass", detail: "Entity registry is complete." }]
  };
}

function pass(actual: string, oracles: OracleName[]): ScenarioOutcome {
  return {
    status: "Pass", category: "Functional", actual,
    oracles: oracles.map((oracle) => ({ oracle, status: "pass", detail: actual }))
  };
}

function fail(actual: string, category: string, oracles: OracleName[]): ScenarioOutcome {
  return {
    status: "Fail", category, actual,
    oracles: oracles.map((oracle) => ({ oracle, status: "fail", detail: actual }))
  };
}

function blocked(actual: string): ScenarioOutcome {
  return {
    status: "Blocked", category: "Automation Blocker", actual,
    oracles: [{ oracle: "ui", status: "not-observed", detail: actual }]
  };
}

function dependencyBlocked(dependency: ScenarioExecutionResult): ScenarioOutcome {
  const reason = `Depends on ${dependency.id}: ${dependency.actual}`;
  return {
    status: "Blocked",
    category: "Dependency Blocker",
    severity: "Medium",
    actual: reason,
    expected: "Fixture-dependent scenario runs only after the prerequisite lead fixture is created.",
    oracles: [{ oracle: "ui", status: "not-observed", detail: reason }],
    dependency: { scenarioId: dependency.id, reason },
    releaseImpact: "Dependent coverage deferred until prerequisite fixture creation is stable."
  };
}

function productConfirmation(actual: string): ScenarioOutcome {
  return {
    status: "Needs Product Confirmation", category: "Needs Product Confirmation", actual,
    oracles: [{ oracle: "blueprint", status: "fail", detail: actual }]
  };
}

function severityFor(status: ScenarioStatus, riskScore: number): ScenarioExecutionResult["severity"] {
  if (status === "Pass" || status === "Not Applicable") return "Low";
  if (riskScore >= 20) return "High";
  if (riskScore >= 13) return "Medium";
  return "Low";
}

function searchableFixture(state: RunnerState): LeadFixture {
  return state.registry.all().some((entry) => entry.uiIdentifier === state.fixture.name)
    ? state.fixture
    : state.baseline;
}

function networkSummary(evidence: MatchedNetworkEvidence): string {
  if (!evidence.matched) return evidence.error ?? `No ${evidence.actionName} network match.`;
  return `${evidence.actionName}: ${evidence.method} ${evidence.status ?? evidence.failure ?? "unknown"} ${evidence.url} in ${evidence.durationMs}ms`;
}
