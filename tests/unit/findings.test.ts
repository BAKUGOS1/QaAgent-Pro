import { describe, expect, test } from "vitest";
import { classifyFinding } from "../../src/findings/classifier.js";
import type {
  ConfirmedBlueprintRequirement,
  ObservedApplicationBehavior,
  ProductConfirmationItem
} from "../../src/findings/types.js";

const blueprint: ConfirmedBlueprintRequirement = {
  source: "confirmed-blueprint",
  id: "BP-001",
  module: "Leads",
  requirement: "Manage Columns is visible",
  sourceReference: "crm.excalidraw",
  confidence: "high"
};

const observed: ObservedApplicationBehavior = {
  source: "observed-application",
  id: "OBS-001",
  module: "Leads",
  behavior: "Manage Columns is not visible",
  evidenceReference: "screenshot.png"
};

const confirmation: ProductConfirmationItem = {
  source: "needs-product-confirmation",
  id: "PC-001",
  module: "Leads",
  question: "Should filters persist?",
  reason: "Blueprint is silent"
};

describe("finding classification", () => {
  test("keeps product confirmation separate", () => {
    expect(classifyFinding({ module: "Leads", scenarioId: "LEAD-001", confirmation })).toEqual({
      source: "needs-product-confirmation",
      category: "Needs Product Confirmation"
    });
  });

  test("classifies missing confirmed controls as a feature gap", () => {
    expect(classifyFinding({ module: "Leads", scenarioId: "LEAD-002", blueprint })).toEqual({
      source: "confirmed-blueprint",
      category: "Feature Gap"
    });
  });

  test("classifies persistence failure from observed evidence", () => {
    expect(classifyFinding({
      module: "Leads",
      scenarioId: "LEAD-006",
      blueprint,
      observed,
      persistenceFailure: true
    }).category).toBe("Data Integrity Issue");
  });

  test("classifies functional, performance, accessibility, and UX evidence", () => {
    expect(classifyFinding({ module: "Leads", scenarioId: "A", observed, functionalFailure: true }).category)
      .toBe("Functional Bug");
    expect(classifyFinding({ module: "Leads", scenarioId: "B", observed, performanceFailure: true }).category)
      .toBe("Performance Issue");
    expect(classifyFinding({ module: "Leads", scenarioId: "C", observed, accessibilityFailure: true }).category)
      .toBe("Accessibility Issue");
    expect(classifyFinding({ module: "Leads", scenarioId: "D", observed, uxConcern: true }).category)
      .toBe("UX Issue");
  });
});
