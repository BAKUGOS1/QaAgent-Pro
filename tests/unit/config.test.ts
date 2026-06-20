import { describe, expect, test } from "vitest";
import { configSummary, parseConfig } from "../../src/config/load.js";

describe("configuration schema", () => {
  test("applies safe defaults without requiring credentials", () => {
    const config = parseConfig({});
    expect(config.REPORT_FORMAT).toBe("xlsx");
    expect(config.HEADLESS).toBe(true);
    expect(config.ALLOW_ARCHIVE).toBe(false);
    expect(config.ALLOW_DELETE).toBe(false);
    expect(config.QA_AGENT_PREFIX).toBe("QA_AGENT_");
  });

  test("parses allowlists and boolean flags", () => {
    const config = parseConfig({
      CRM_BASE_URL: "https://staging.example.com",
      STAGING_HOST_ALLOWLIST: "staging.example.com, qa.example.com",
      ALLOW_ARCHIVE: "true",
      HEADLESS: "false"
    });
    expect(config.STAGING_HOST_ALLOWLIST).toEqual(["staging.example.com", "qa.example.com"]);
    expect(config.ALLOW_ARCHIVE).toBe(true);
    expect(config.HEADLESS).toBe(false);
  });

  test("rejects malformed URL and report formats", () => {
    expect(() => parseConfig({ CRM_BASE_URL: "not a URL" })).toThrow();
    expect(() => parseConfig({ REPORT_FORMAT: "pdf" })).toThrow();
  });

  test("summarizes presence without exposing credentials", () => {
    const config = parseConfig({ CRM_EMAIL: "qa@example.com", CRM_PASSWORD: "secret" });
    const summary = JSON.stringify(configSummary(config));
    expect(summary).toContain('"emailConfigured":true');
    expect(summary).toContain('"passwordConfigured":true');
    expect(summary).not.toContain("qa@example.com");
    expect(summary).not.toContain("secret");
  });
});
