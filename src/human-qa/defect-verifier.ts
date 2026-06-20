import type {
  ExecutionEvidence,
  OracleName,
  VerificationResult
} from "./types.js";

const applicationOracles = new Set<OracleName>([
  "ui",
  "network",
  "persistence",
  "search-table",
  "console",
  "accessibility",
  "performance"
]);

export function verifyExecution(
  evidence: ExecutionEvidence,
  requiredOracles: OracleName[]
): VerificationResult {
  const observed = new Map(evidence.oracles.map((oracle) => [oracle.oracle, oracle]));
  const missingOracles = requiredOracles.filter((oracle) => observed.get(oracle)?.status === undefined
    || observed.get(oracle)?.status === "not-observed");
  const failed = evidence.oracles.filter((oracle) => oracle.status === "fail");
  const passed = evidence.oracles.filter((oracle) => oracle.status === "pass");
  const reasons: string[] = [];

  if (!evidence.actionCompleted) {
    reasons.push(evidence.actionError ?? "The deterministic action did not complete.");
    return {
      scenarioId: evidence.scenarioId,
      attribution: "automation-defect",
      confidence: 0.9,
      verified: false,
      reasons,
      missingOracles
    };
  }

  if (failed.length === 0 && missingOracles.length === 0) {
    return {
      scenarioId: evidence.scenarioId,
      attribution: "no-defect",
      confidence: 0.95,
      verified: true,
      reasons: ["All required oracles passed."],
      missingOracles
    };
  }

  if (failed.some((oracle) => oracle.oracle === "blueprint") && failed.length === 1) {
    return {
      scenarioId: evidence.scenarioId,
      attribution: "product-ambiguity",
      confidence: 0.75,
      verified: false,
      reasons: ["Observed behavior conflicts with the blueprint but no functional oracle failed."],
      missingOracles
    };
  }

  const applicationFailures = failed.filter((oracle) => applicationOracles.has(oracle.oracle));
  const independentEvidenceCount = applicationFailures.length + passed.filter((oracle) =>
    oracle.oracle === "network" || oracle.oracle === "persistence" || oracle.oracle === "search-table"
  ).length;
  if (applicationFailures.length > 0 && independentEvidenceCount >= 2) {
    reasons.push(...applicationFailures.map((oracle) => `${oracle.oracle}: ${oracle.detail}`));
    return {
      scenarioId: evidence.scenarioId,
      attribution: "application-defect",
      confidence: Math.min(0.98, 0.65 + independentEvidenceCount * 0.1),
      verified: true,
      reasons,
      missingOracles
    };
  }

  return {
    scenarioId: evidence.scenarioId,
    attribution: "insufficient-evidence",
    confidence: missingOracles.length > 0 ? 0.4 : 0.55,
    verified: false,
    reasons: ["The suspected defect lacks enough independent oracle evidence."],
    missingOracles
  };
}
