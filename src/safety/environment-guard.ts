import type { AppConfig } from "../config/schema.js";
import type { ExecutionAccess } from "../shared/types.js";

export interface EnvironmentEvidence {
  visibleMarkers?: string[];
}

export interface EnvironmentDecision {
  access: ExecutionAccess;
  checks: {
    stagingEnvironment: boolean;
    hostnameAllowlisted: boolean;
    tenantAllowlisted: boolean;
    qaAccountAllowlisted: boolean;
    visibleStagingMarker: boolean;
  };
  reasons: string[];
}

function normalizedIncludes(values: string[], expected: string): boolean {
  const normalizedExpected = expected.trim().toLowerCase();
  return values.some((value) => value.trim().toLowerCase() === normalizedExpected);
}

export function evaluateEnvironment(
  config: AppConfig,
  evidence: EnvironmentEvidence = {}
): EnvironmentDecision {
  const hostname = config.CRM_BASE_URL ? new URL(config.CRM_BASE_URL).hostname.toLowerCase() : "";
  const markers = (evidence.visibleMarkers ?? []).map((value) => value.toLowerCase());
  const markerMatched = config.STAGING_MARKER_PATTERNS.some((pattern) =>
    markers.some((marker) => marker.includes(pattern.toLowerCase()))
  );

  const checks = {
    stagingEnvironment: config.CRM_ENVIRONMENT.toLowerCase() === "staging",
    hostnameAllowlisted: hostname.length > 0 && normalizedIncludes(config.STAGING_HOST_ALLOWLIST, hostname),
    tenantAllowlisted: normalizedIncludes(config.STAGING_TENANT_ALLOWLIST, config.CRM_TENANT),
    qaAccountAllowlisted: normalizedIncludes(config.QA_ACCOUNT_ALLOWLIST, config.CRM_EMAIL),
    visibleStagingMarker: config.REQUIRE_VISIBLE_STAGING_MARKER ? markerMatched : true
  };

  const messages: Record<keyof typeof checks, string> = {
    stagingEnvironment: "CRM_ENVIRONMENT is not staging.",
    hostnameAllowlisted: "CRM hostname is not allowlisted.",
    tenantAllowlisted: "CRM tenant is not allowlisted.",
    qaAccountAllowlisted: "CRM account is not allowlisted as a dedicated QA account.",
    visibleStagingMarker: "No configured staging/test marker was verified."
  };
  const reasons = (Object.keys(checks) as Array<keyof typeof checks>)
    .filter((key) => !checks[key])
    .map((key) => messages[key]);

  return {
    access: reasons.length === 0 ? "mutation-allowed" : "read-only",
    checks,
    reasons
  };
}
