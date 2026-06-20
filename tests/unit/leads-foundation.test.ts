import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import { leadsBlueprintRequirements } from "../../src/blueprint/leads-blueprint.js";
import { createLeadFixture } from "../../src/data/lead-fixture.js";
import { DeterministicActionRegistry } from "../../src/leads/action-registry.js";
import { EntityRegistry } from "../../src/leads/entity-registry.js";
import { leadsScenarios } from "../../src/leads/scenarios.js";

describe("Leads MVP contracts", () => {
  test("defines exactly 56 ordered scenarios", () => {
    expect(leadsScenarios).toHaveLength(56);
    expect(leadsScenarios[0]?.id).toBe("LEAD-001");
    expect(leadsScenarios[55]?.id).toBe("LEAD-056");
    expect(new Set(leadsScenarios.map((scenario) => scenario.id)).size).toBe(56);
  });

  test("keeps destructive lifecycle scenarios risk-prioritized", () => {
    expect(leadsScenarios.find((item) => item.id === "LEAD-024")).toMatchObject({
      mutation: true,
      riskScore: 20
    });
  });

  test("contains confirmed toolbar and table blueprint requirements", () => {
    expect(leadsBlueprintRequirements.map((item) => item.label)).toEqual(expect.arrayContaining([
      "Inbox", "Archive", "Filter", "Search", "Add Lead",
      "Import Data", "Export Data", "Manage Columns", "Company Name", "Name"
    ]));
  });

  test("generates unique QA-prefixed fixtures", () => {
    const fixture = createLeadFixture("QA_AGENT_", "QAP-20260620", "PRIMARY");
    expect(fixture.name).toContain("QA_AGENT_");
    expect(fixture.email).toMatch(/@example\.com$/);
    expect(fixture.mobile).toMatch(/^9\d{9}$/);
  });
});

describe("deterministic action registry", () => {
  test("registers and executes only named deterministic actions", async () => {
    const registry = new DeterministicActionRegistry();
    const action = vi.fn(async () => {});
    registry.register("leads.observe-table", action);
    const page = {} as never;
    await registry.execute("leads.observe-table", page);
    expect(action).toHaveBeenCalledWith(page);
    expect(registry.names()).toEqual(["leads.observe-table"]);
    expect(registry.has("leads.observe-table")).toBe(true);
    expect(registry.has("leads.unknown")).toBe(false);
  });

  test("rejects invalid, duplicate, and unsupported actions", async () => {
    const registry = new DeterministicActionRegistry();
    expect(() => registry.register("random", async () => {})).toThrow();
    registry.register("leads.observe-table", async () => {});
    expect(() => registry.register("leads.observe-table", async () => {})).toThrow();
    await expect(registry.execute("leads.random-click", {} as never)).rejects.toThrow();
  });
});

describe("entity cleanup registry", () => {
  test("persists and reconciles generated records without delete", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qap-entities-"));
    const output = path.join(directory, "entities.json");
    const registry = new EntityRegistry("RUN-1", output);
    registry.add({
      entityType: "lead",
      uiIdentifier: "QA_AGENT_TEST",
      createdByRun: true,
      currentState: "inbox"
    });
    registry.update("QA_AGENT_TEST", { currentState: "archive" });
    expect(fs.existsSync(output)).toBe(true);
    expect(registry.all()[0]?.currentState).toBe("archive");
    expect(registry.reconcile()[0]).toMatchObject({
      status: "Retained",
      entity: { runId: "RUN-1", uiIdentifier: "QA_AGENT_TEST" }
    });
  });

  test("restores pre-existing records and retains bug fixtures", () => {
    const registry = new EntityRegistry("RUN-2", path.join(os.tmpdir(), `qap-${Date.now()}.json`));
    registry.add({
      entityType: "lead",
      uiIdentifier: "EXISTING",
      createdByRun: false,
      currentState: "inbox"
    });
    registry.add({
      entityType: "lead",
      uiIdentifier: "BUG-FIXTURE",
      createdByRun: true,
      currentState: "archive",
      retainedForFinding: "QAP-BUG-001"
    });
    expect(registry.reconcile().map((item) => item.status)).toEqual(["Restored", "Retained"]);
  });
});
