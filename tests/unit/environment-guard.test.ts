import { describe, expect, test } from "vitest";
import { parseConfig } from "../../src/config/load.js";
import { evaluateEnvironment } from "../../src/safety/environment-guard.js";

const verifiedEnvironment = {
  CRM_BASE_URL: "https://staging.example.com",
  CRM_EMAIL: "qa@example.com",
  CRM_PASSWORD: "secret",
  CRM_ENVIRONMENT: "staging",
  CRM_TENANT: "QA-TENANT",
  STAGING_HOST_ALLOWLIST: "staging.example.com",
  STAGING_TENANT_ALLOWLIST: "QA-TENANT",
  QA_ACCOUNT_ALLOWLIST: "qa@example.com",
  STAGING_MARKER_PATTERNS: "staging,test,qa",
  REQUIRE_VISIBLE_STAGING_MARKER: "true"
};

describe("environment mutation guard", () => {
  test("allows mutation only when every gate passes", () => {
    const decision = evaluateEnvironment(parseConfig(verifiedEnvironment), {
      visibleMarkers: ["QA-TENANT TESTING"]
    });
    expect(decision.access).toBe("mutation-allowed");
    expect(decision.reasons).toEqual([]);
  });

  test.each([
    ["environment", { CRM_ENVIRONMENT: "production" }],
    ["hostname", { STAGING_HOST_ALLOWLIST: "other.example.com" }],
    ["tenant", { STAGING_TENANT_ALLOWLIST: "OTHER" }],
    ["account", { QA_ACCOUNT_ALLOWLIST: "other@example.com" }]
  ])("falls back to read-only for failed %s gate", (_name, override) => {
    const decision = evaluateEnvironment(parseConfig({ ...verifiedEnvironment, ...override }), {
      visibleMarkers: ["QA-TENANT TESTING"]
    });
    expect(decision.access).toBe("read-only");
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  test("requires a visible marker when configured", () => {
    const decision = evaluateEnvironment(parseConfig(verifiedEnvironment), { visibleMarkers: [] });
    expect(decision.access).toBe("read-only");
    expect(decision.checks.visibleStagingMarker).toBe(false);
  });

  test("can disable visible marker requirement while retaining other gates", () => {
    const config = parseConfig({ ...verifiedEnvironment, REQUIRE_VISIBLE_STAGING_MARKER: "false" });
    expect(evaluateEnvironment(config).access).toBe("mutation-allowed");
  });
});
