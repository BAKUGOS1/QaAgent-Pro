import type { AppConfig } from "../config/schema.js";
import type { EnvironmentDecision } from "./environment-guard.js";

export type ActionKind =
  | "read"
  | "create"
  | "edit"
  | "note"
  | "activity"
  | "convert"
  | "archive"
  | "unarchive"
  | "delete"
  | "real-message"
  | "sensitive-export";

export interface SafetyDecision {
  allowed: boolean;
  mode: "read-only" | "staging-write" | "destructive-staging";
  reason: string;
}

export function authorizeAction(
  action: ActionKind,
  config: AppConfig,
  environment: EnvironmentDecision
): SafetyDecision {
  if (action === "read") {
    return { allowed: true, mode: "read-only", reason: "Read-only action." };
  }
  if (environment.access !== "mutation-allowed") {
    return { allowed: false, mode: "read-only", reason: environment.reasons.join(" ") };
  }
  if (action === "archive" || action === "unarchive") {
    return config.ALLOW_ARCHIVE
      ? { allowed: true, mode: "staging-write", reason: "Archive policy explicitly enabled." }
      : { allowed: false, mode: "read-only", reason: "ALLOW_ARCHIVE is false." };
  }
  if (action === "delete") {
    return config.ALLOW_DELETE && config.ALLOW_DESTRUCTIVE
      ? { allowed: true, mode: "destructive-staging", reason: "Delete and destructive flags enabled." }
      : { allowed: false, mode: "staging-write", reason: "Delete requires ALLOW_DELETE and ALLOW_DESTRUCTIVE." };
  }
  if (action === "real-message") {
    return config.ALLOW_REAL_MESSAGES
      ? { allowed: true, mode: "staging-write", reason: "Real messages explicitly enabled." }
      : { allowed: false, mode: "staging-write", reason: "Real messages are disabled." };
  }
  if (action === "sensitive-export") {
    return config.ALLOW_SENSITIVE_EXPORT
      ? { allowed: true, mode: "staging-write", reason: "Sensitive export explicitly enabled." }
      : { allowed: false, mode: "staging-write", reason: "Sensitive export is disabled." };
  }
  return { allowed: true, mode: "staging-write", reason: "Verified staging mutation." };
}
