import { describe, expect, test } from "vitest";
import { parseGherkinSteps } from "../../src/human-qa/gherkin.js";
import { prepareMission } from "../../src/human-qa/orchestrator.js";

const mission = {
  id: "MISSION-LEADS-01",
  title: "Review Leads persistence",
  module: "Leads",
  charter: "Review lead state changes to discover stale data and persistence failures.",
  persona: "Sales user",
  timeboxMinutes: 45,
  heuristics: ["interruptions", "persistence"],
  oracles: ["ui", "network", "persistence", "search-table"],
  risks: [{
    id: "R1",
    description: "Saved lead data disappears after reload.",
    likelihood: 4,
    impact: 5,
    evidence: ["Prior stale-state concern"]
  }],
  steps: [
    { id: "S1", phase: "given", instruction: "A QA lead exists." },
    { id: "S2", phase: "when", instruction: "Edit the lead.", actionRef: "leads.edit-own-record" },
    { id: "S3", phase: "then", instruction: "The edit persists.", expected: "Updated value survives reload." }
  ]
};

describe("human-QA mission preparation", () => {
  test("validates, risk-scores, and expands a deterministic mission", () => {
    const prepared = prepareMission(mission);
    expect(prepared.risks[0]).toMatchObject({ score: 20, level: "critical" });
    expect(prepared.intents).toHaveLength(3);
    expect(prepared.intents[0]).toMatchObject({
      heuristic: "base-mission",
      priority: "critical",
      executable: true,
      actionRefs: ["leads.edit-own-record"]
    });
    expect(prepared.intents.slice(1).every((intent) => !intent.executable)).toBe(true);
  });

  test("marks a mission non-executable when a When step lacks an action reference", () => {
    const changed = structuredClone(mission);
    const whenStep = changed.steps[1];
    if (!whenStep) throw new Error("Expected a When step fixture.");
    delete whenStep.actionRef;
    const firstIntent = prepareMission(changed).intents[0];
    expect(firstIntent?.executable).toBe(false);
  });

  test("rejects unsupported heuristics", () => {
    expect(() => prepareMission({ ...mission, heuristics: ["random-clicking"] })).toThrow();
  });
});

describe("Gherkin-inspired mission input", () => {
  test("parses Given/When/Then and inherits And phase", () => {
    expect(parseGherkinSteps(`
      Feature: Leads
      Scenario: Observe table
      Given the QA user is authenticated
      And the Leads table is visible
      When the table state is captured
      Then blueprint controls are compared
    `)).toEqual([
      { id: "STEP-001", phase: "given", instruction: "the QA user is authenticated" },
      { id: "STEP-002", phase: "given", instruction: "the Leads table is visible" },
      { id: "STEP-003", phase: "when", instruction: "the table state is captured" },
      { id: "STEP-004", phase: "then", instruction: "blueprint controls are compared" }
    ]);
  });

  test("rejects an orphan And and empty source", () => {
    expect(() => parseGherkinSteps("And something happens")).toThrow();
    expect(() => parseGherkinSteps("Feature: Empty")).toThrow();
  });
});
