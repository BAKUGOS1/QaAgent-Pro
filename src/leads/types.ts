import type { BrowserEvidence } from "../browser/evidence-recorder.js";
import type { MatchedNetworkEvidence } from "../browser/network-match.js";
import type { OracleEvidence, ReleaseVerdict, VerificationResult } from "../human-qa/types.js";

export type ScenarioStatus = "Pass" | "Fail" | "Blocked" | "Needs Product Confirmation" | "Not Applicable";

export interface BlueprintRequirement {
  id: string;
  label: string;
  area: "toolbar" | "table" | "detail" | "activity" | "lifecycle";
  confidence: "high" | "medium";
}

export interface ObservedControl {
  label: string;
  visible: boolean;
  role?: string;
  evidence?: string;
}

export interface ActionEvidenceScope {
  startedAt: string;
  endedAt: string;
  durationMs: number;
  browser: BrowserEvidence;
  tracePath?: string;
  matchedNetwork?: MatchedNetworkEvidence[];
  validationMessages?: string[];
  screenshotPath?: string;
}

export interface ScenarioDependency {
  scenarioId: string;
  reason: string;
}

export interface ScenarioExecutionResult {
  id: string;
  title: string;
  status: ScenarioStatus;
  category: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  steps: string;
  expected: string;
  actual: string;
  oracles: OracleEvidence[];
  evidence: ActionEvidenceScope;
  verification: VerificationResult;
  riskScore: number;
  releaseImpact: string;
  dependency?: ScenarioDependency;
}

export interface OriginalEntitySnapshot {
  name: string;
  company: string;
  mobile: string;
  email: string;
  state: "inbox" | "archive";
}

export interface EntityRegistryEntry {
  runId: string;
  entityType: "lead" | "deal";
  uiIdentifier: string;
  backendId?: string;
  createdByRun: boolean;
  original?: OriginalEntitySnapshot;
  currentState: string;
  retainedForFinding?: string;
}

export interface CleanupResult {
  entity: EntityRegistryEntry;
  status: "Cleaned" | "Restored" | "Retained" | "Not Found" | "Cleanup Failed";
  detail: string;
}

export interface LeadsRunReport {
  runId: string;
  startedAt: string;
  endedAt: string;
  environmentAccess: "read-only" | "mutation-allowed";
  scenarios: ScenarioExecutionResult[];
  cleanup: CleanupResult[];
  release: ReleaseVerdict;
  reportPath: string;
}

export interface LeadFixture {
  name: string;
  company: string;
  mobile: string;
  email: string;
  value: string;
}

export type LeadSaveUiOutcome =
  | { state: "closed"; validationMessages: string[] }
  | { state: "validation-visible"; validationMessages: string[] }
  | { state: "still-open"; validationMessages: string[] };
