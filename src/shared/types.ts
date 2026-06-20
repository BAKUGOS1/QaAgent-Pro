export const qaModes = [
  "blueprint",
  "smoke",
  "leads",
  "refresh",
  "ux",
  "regression",
  "full-destructive"
] as const;

export type QaMode = (typeof qaModes)[number];
export type SafetyProfile = "read-only-audit" | "safe" | "staging-write" | "destructive-staging";
export type ExecutionAccess = "read-only" | "mutation-allowed";

export interface RunManifest {
  mode: QaMode;
  safetyProfile: SafetyProfile;
  access: ExecutionAccess;
  reasons: string[];
  phase: 1;
}
