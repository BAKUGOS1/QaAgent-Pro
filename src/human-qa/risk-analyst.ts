import type { MissionRisk, RiskAssessment } from "./types.js";

export function levelForRiskScore(score: number): RiskAssessment["level"] {
  if (score >= 20) return "critical";
  if (score >= 13) return "high";
  if (score >= 6) return "medium";
  return "low";
}

export function assessRisks(risks: MissionRisk[]): RiskAssessment[] {
  return risks
    .map((risk) => {
      const score = risk.likelihood * risk.impact;
      return {
        riskId: risk.id,
        score,
        level: levelForRiskScore(score),
        likelihood: risk.likelihood,
        impact: risk.impact,
        rationale: `${risk.description} Likelihood ${risk.likelihood}/5 × impact ${risk.impact}/5.`
      };
    })
    .sort((left, right) => right.score - left.score || left.riskId.localeCompare(right.riskId));
}
