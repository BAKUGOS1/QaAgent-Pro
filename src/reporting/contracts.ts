export const workbookSheetOrder = [
  "Bug Report",
  "Summary",
  "UX Issues",
  "Feature Gaps",
  "Refresh Persistence",
  "Next Build Backlog",
  "Test Execution",
  "Evidence Log",
  "Run Metadata"
] as const;

export interface FindingReportRow {
  findingId: string;
  module: string;
  scenarioId: string;
  sourceClassification: string;
  category: string;
  severity: string;
  steps: string;
  expectedResult: string;
  actualResult: string;
  uiEvidence: string;
  networkEvidence: string;
  persistenceResult: string;
  traceReference: string;
  productConfirmationStatus: string;
  screenshotPath?: string;
  verificationAttribution?: string;
  verificationConfidence?: number;
  riskScore?: number;
  releaseImpact?: string;
}

export interface CleanupReconciliationRow {
  runId: string;
  entityType: string;
  entityId: string;
  finalState: string;
  cleanupAction: string;
  retainedReason: string;
  reconciliationStatus: "Cleaned" | "Restored" | "Retained" | "Not Found" | "Cleanup Failed";
}
