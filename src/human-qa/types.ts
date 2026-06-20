export const heuristicNames = [
  "boundaries",
  "interruptions",
  "state-transitions",
  "data-variations",
  "error-guessing",
  "checklist",
  "consistency",
  "persistence",
  "accessibility",
  "performance"
] as const;

export type HeuristicName = (typeof heuristicNames)[number];
export type OracleName =
  | "ui"
  | "network"
  | "persistence"
  | "search-table"
  | "console"
  | "blueprint"
  | "accessibility"
  | "performance";

export interface MissionRisk {
  id: string;
  description: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  evidence: string[];
}

export interface MissionStep {
  id: string;
  phase: "given" | "when" | "then";
  instruction: string;
  actionRef?: string | undefined;
  expected?: string | undefined;
}

export interface QaMission {
  id: string;
  title: string;
  module: string;
  charter: string;
  persona: string;
  timeboxMinutes: number;
  heuristics: HeuristicName[];
  oracles: OracleName[];
  risks: MissionRisk[];
  steps: MissionStep[];
}

export interface TestIntent {
  id: string;
  missionId: string;
  title: string;
  rationale: string;
  heuristic: HeuristicName | "base-mission";
  requiredOracles: OracleName[];
  priority: "critical" | "high" | "medium" | "low";
  executable: boolean;
  actionRefs: string[];
}

export interface RiskAssessment {
  riskId: string;
  score: number;
  level: "critical" | "high" | "medium" | "low";
  likelihood: number;
  impact: number;
  rationale: string;
}

export interface OracleEvidence {
  oracle: OracleName;
  status: "pass" | "fail" | "not-observed";
  detail: string;
  reference?: string;
}

export interface ExecutionEvidence {
  scenarioId: string;
  actionCompleted: boolean;
  actionError?: string | undefined;
  oracles: OracleEvidence[];
  screenshots: string[];
  tracePath?: string | undefined;
}

export type FailureAttribution =
  | "application-defect"
  | "automation-defect"
  | "environment-failure"
  | "product-ambiguity"
  | "insufficient-evidence"
  | "no-defect";

export interface VerificationResult {
  scenarioId: string;
  attribution: FailureAttribution;
  confidence: number;
  verified: boolean;
  reasons: string[];
  missingOracles: OracleName[];
}

export interface ReleaseVerdict {
  decision: "go" | "conditional-go" | "no-go";
  confidence: number;
  reasons: string[];
  residualRisks: string[];
}
