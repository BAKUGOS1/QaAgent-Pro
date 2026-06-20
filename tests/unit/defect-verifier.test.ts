import { describe, expect, test } from "vitest";
import { verifyExecution } from "../../src/human-qa/defect-verifier.js";
import type { ExecutionEvidence } from "../../src/human-qa/types.js";

function evidence(overrides: Partial<ExecutionEvidence> = {}): ExecutionEvidence {
  return {
    scenarioId: "LEAD-006",
    actionCompleted: true,
    oracles: [],
    screenshots: [],
    ...overrides
  };
}

describe("independent defect verifier", () => {
  test("attributes an incomplete action to automation instead of the product", () => {
    expect(verifyExecution(evidence({
      actionCompleted: false,
      actionError: "Locator did not resolve"
    }), ["ui"])).toMatchObject({
      attribution: "automation-defect",
      verified: false
    });
  });

  test("verifies no defect when every required oracle passes", () => {
    expect(verifyExecution(evidence({
      oracles: [
        { oracle: "ui", status: "pass", detail: "Toast and row visible" },
        { oracle: "network", status: "pass", detail: "HTTP 200" }
      ]
    }), ["ui", "network"])).toMatchObject({
      attribution: "no-defect",
      verified: true
    });
  });

  test("requires independent evidence for an application defect", () => {
    const result = verifyExecution(evidence({
      oracles: [
        { oracle: "ui", status: "fail", detail: "Row is stale" },
        { oracle: "network", status: "pass", detail: "HTTP 200" },
        { oracle: "persistence", status: "fail", detail: "Reload lost the update" }
      ]
    }), ["ui", "network", "persistence"]);
    expect(result.attribution).toBe("application-defect");
    expect(result.verified).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test("keeps blueprint-only conflict as product ambiguity", () => {
    expect(verifyExecution(evidence({
      oracles: [{ oracle: "blueprint", status: "fail", detail: "Control is absent" }]
    }), ["blueprint"])).toMatchObject({
      attribution: "product-ambiguity",
      verified: false
    });
  });

  test("reports insufficient evidence and missing oracles", () => {
    const result = verifyExecution(evidence({
      oracles: [{ oracle: "ui", status: "fail", detail: "Unexpected text" }]
    }), ["ui", "network"]);
    expect(result.attribution).toBe("insufficient-evidence");
    expect(result.missingOracles).toEqual(["network"]);
  });
});
