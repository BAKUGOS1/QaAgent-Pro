import type { AppConfig } from "../config/schema.js";
import { evaluateEnvironment } from "../safety/environment-guard.js";
import type { CliOptions } from "./options.js";
import type { RunManifest, SafetyProfile } from "../shared/types.js";

function profileForMode(mode: CliOptions["mode"]): SafetyProfile {
  if (mode === "blueprint" || mode === "ux") return "read-only-audit";
  if (mode === "full-destructive") return "destructive-staging";
  if (mode === "leads" || mode === "regression" || mode === "refresh") return "staging-write";
  return "safe";
}

export function buildRunManifest(config: AppConfig, options: CliOptions): RunManifest {
  const environment = evaluateEnvironment(config, { visibleMarkers: options.visibleMarkers });
  const requestedProfile = profileForMode(options.mode);
  const access = requestedProfile === "read-only-audit" || requestedProfile === "safe"
    ? "read-only"
    : environment.access;
  return {
    mode: options.mode,
    safetyProfile: access === "read-only" && requestedProfile !== "safe"
      ? "read-only-audit"
      : requestedProfile,
    access,
    reasons: access === "read-only"
      ? [...environment.reasons, "CRM execution is not implemented in Phase 1."]
      : ["Environment verified, but CRM execution is not implemented in Phase 1."],
    phase: 1
  };
}
