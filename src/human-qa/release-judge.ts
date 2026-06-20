import type { ReleaseVerdict, RiskAssessment, VerificationResult } from "./types.js";

export interface ReleaseInput {
  verifications: VerificationResult[];
  risks: RiskAssessment[];
  blockedScenarios: string[];
  coveragePercent: number;
}

export function judgeRelease(input: ReleaseInput): ReleaseVerdict {
  const verifiedDefects = input.verifications.filter((item) =>
    item.verified && item.attribution === "application-defect"
  );
  const unresolvedCriticalRisks = input.risks.filter((risk) => risk.level === "critical");
  const residualRisks = [
    ...unresolvedCriticalRisks.map((risk) => `${risk.riskId}: ${risk.rationale}`),
    ...input.blockedScenarios.map((scenario) => `${scenario}: blocked or not executed`),
    ...input.verifications
      .filter((item) => item.attribution === "insufficient-evidence")
      .map((item) => `${item.scenarioId}: insufficient evidence`)
  ];

  if (verifiedDefects.length > 0 || unresolvedCriticalRisks.length > 0) {
    return {
      decision: "no-go",
      confidence: verifiedDefects.length > 0 ? 0.95 : 0.85,
      reasons: [
        `${verifiedDefects.length} verified application defect(s).`,
        `${unresolvedCriticalRisks.length} unresolved critical risk(s).`
      ],
      residualRisks
    };
  }

  if (input.blockedScenarios.length > 0 || input.coveragePercent < 90 || residualRisks.length > 0) {
    return {
      decision: "conditional-go",
      confidence: Math.max(0.5, Math.min(0.85, input.coveragePercent / 100)),
      reasons: [`Coverage is ${input.coveragePercent}%; residual risk remains.`],
      residualRisks
    };
  }

  return {
    decision: "go",
    confidence: 0.95,
    reasons: ["No verified defects or unresolved critical risks; required coverage is complete."],
    residualRisks: []
  };
}
