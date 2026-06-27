import type { OracleName } from "../../human-qa/types.js";
import type { ScenarioExecutionResult, ScenarioStatus } from "../../leads/types.js";

export interface ScenarioOutcome {
  status: ScenarioStatus;
  category: string;
  severity?: ScenarioExecutionResult["severity"];
  actual: string;
  expected?: string;
  oracles: Array<{ oracle: OracleName; status: "pass" | "fail" | "not-observed"; detail: string }>;
  releaseImpact?: string;
  matchedNetwork?: import("../../browser/network-match.js").MatchedNetworkEvidence[];
  validationMessages?: string[];
  dependency?: ScenarioExecutionResult["dependency"];
}

export function pass(actual: string, oracles: OracleName[]): ScenarioOutcome {
  return {
    status: "Pass",
    category: "Functional",
    actual,
    oracles: oracles.map((oracle) => ({ oracle, status: "pass", detail: actual }))
  };
}

export function fail(actual: string, category: string, oracles: OracleName[]): ScenarioOutcome {
  return {
    status: "Fail",
    category,
    actual,
    oracles: oracles.map((oracle) => ({ oracle, status: "fail", detail: actual }))
  };
}

export function blocked(actual: string): ScenarioOutcome {
  return {
    status: "Blocked",
    category: "Automation Blocker",
    actual,
    oracles: [{ oracle: "ui", status: "not-observed", detail: actual }]
  };
}

export function dependencyBlocked(dependency: ScenarioExecutionResult): ScenarioOutcome {
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

export function productConfirmation(actual: string): ScenarioOutcome {
  return {
    status: "Needs Product Confirmation",
    category: "Needs Product Confirmation",
    actual,
    oracles: [{ oracle: "blueprint", status: "fail", detail: actual }]
  };
}

export function severityFor(
  status: ScenarioStatus,
  riskScore: number
): ScenarioExecutionResult["severity"] {
  if (status === "Pass" || status === "Not Applicable") return "Low";
  if (riskScore >= 20) return "High";
  if (riskScore >= 13) return "Medium";
  return "Low";
}
