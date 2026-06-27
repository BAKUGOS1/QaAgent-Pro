import type { AppConfig } from "../config/schema.js";
import type { EnvironmentDecision } from "./environment-guard.js";
import { authorizeAction, type ActionKind, type SafetyDecision } from "./policy.js";

const scenarioActionKinds: Record<string, ActionKind> = {
  "LEAD-006": "create",
  "LEAD-007": "create",
  "LEAD-013": "edit",
  "LEAD-014": "edit",
  "LEAD-015": "edit",
  "LEAD-016": "edit",
  "LEAD-017": "edit",
  "LEAD-018": "note",
  "LEAD-019": "activity",
  "LEAD-023": "convert",
  "LEAD-024": "archive",
  "LEAD-025": "read",
  "LEAD-026": "unarchive",
  "LEAD-027": "archive",
  "LEAD-050": "create",
  "LEAD-054": "edit",
  "LEAD-055": "edit",
  "LEAD-056": "read"
};

export function actionKindForScenario(scenarioId: string): ActionKind {
  return scenarioActionKinds[scenarioId] ?? "read";
}

export function authorizeScenario(
  scenarioId: string,
  config: AppConfig,
  environment: EnvironmentDecision
): SafetyDecision {
  const action = actionKindForScenario(scenarioId);
  return authorizeAction(action, config, environment);
}
