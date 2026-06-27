import { captureActionNetwork, networkEvidenceSucceeded, type ExpectedNetworkAction, type MatchedNetworkEvidence } from "../../browser/network-match.js";
import { redactText } from "../../shared/redaction.js";
import type { RunnerState } from "./runner-state.js";
import { fail, productConfirmation, type ScenarioOutcome } from "./outcome-helpers.js";

const createLeadNetworkExpectation: ExpectedNetworkAction = {
  actionName: "leads.create",
  urlPattern: /\/api\/v1\/leads(?:[/?]|$)/,
  excludeUrlPattern: /\/api\/v1\/leads\/search(?:\?|$)/,
  methods: ["POST"],
  expectedStatusMin: 200,
  expectedStatusMax: 299,
  timeoutMs: 4_000
};

export async function createLead(state: RunnerState): Promise<ScenarioOutcome> {
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

export function duplicateBehavior(): ScenarioOutcome {
  return productConfirmation("Duplicate blocking/warning rule is not confirmed; fixture creation is not repeated automatically.");
}

export function networkSummary(evidence: MatchedNetworkEvidence): string {
  if (!evidence.matched) return evidence.error ?? `No ${evidence.actionName} network match.`;
  return `${evidence.actionName}: ${evidence.method} ${evidence.status ?? evidence.failure ?? "unknown"} ${evidence.url} in ${evidence.durationMs}ms`;
}
