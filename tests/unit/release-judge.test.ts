import { describe, expect, test } from "vitest";
import { judgeRelease } from "../../src/human-qa/release-judge.js";

describe("release judge", () => {
  test("returns no-go for verified defects", () => {
    expect(judgeRelease({
      coveragePercent: 100,
      blockedScenarios: [],
      risks: [],
      verifications: [{
        scenarioId: "LEAD-006",
        attribution: "application-defect",
        confidence: 0.9,
        verified: true,
        reasons: ["Persistence failed"],
        missingOracles: []
      }]
    }).decision).toBe("no-go");
  });

  test("returns no-go for unresolved critical risk", () => {
    expect(judgeRelease({
      coveragePercent: 100,
      blockedScenarios: [],
      verifications: [],
      risks: [{
        riskId: "R1",
        score: 25,
        level: "critical",
        likelihood: 5,
        impact: 5,
        rationale: "Data loss risk"
      }]
    }).decision).toBe("no-go");
  });

  test("returns conditional-go for incomplete coverage or blocked scenarios", () => {
    const result = judgeRelease({
      coveragePercent: 82,
      blockedScenarios: ["LEAD-023"],
      risks: [],
      verifications: []
    });
    expect(result.decision).toBe("conditional-go");
    expect(result.residualRisks).toContain("LEAD-023: blocked or not executed");
  });

  test("returns go only with complete clean evidence", () => {
    expect(judgeRelease({
      coveragePercent: 100,
      blockedScenarios: [],
      risks: [],
      verifications: [{
        scenarioId: "LEAD-001",
        attribution: "no-defect",
        confidence: 0.95,
        verified: true,
        reasons: ["All passed"],
        missingOracles: []
      }]
    })).toMatchObject({ decision: "go", confidence: 0.95 });
  });
});
