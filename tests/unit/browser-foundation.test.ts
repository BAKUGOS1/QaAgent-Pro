import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { EvidenceRecorder, sanitizeUrl } from "../../src/browser/evidence-recorder.js";
import { networkEvidenceMatches, networkEvidenceSucceeded, type ExpectedNetworkAction } from "../../src/browser/network-match.js";
import { ensureBrowserDirectories, hasStoredAuth } from "../../src/browser/session.js";

describe("browser foundation", () => {
  test("redacts sensitive URL values and supplied secrets", () => {
    const result = sanitizeUrl(
      "https://crm.test/api?token=abc&view=secret-value",
      ["secret-value"]
    );
    expect(result).toContain("token=[REDACTED]");
    expect(result).not.toContain("abc");
    expect(result).not.toContain("secret-value");
  });

  test("returns an isolated evidence snapshot", () => {
    const recorder = new EvidenceRecorder(["secret"]);
    const first = recorder.snapshot();
    first.consoleErrors.push("changed");
    expect(recorder.snapshot().consoleErrors).toEqual([]);
  });

  test("creates expected local artifact directories", () => {
    ensureBrowserDirectories();
    expect(fs.existsSync(".auth")).toBe(true);
    expect(fs.existsSync("artifacts/traces")).toBe(true);
    expect(typeof hasStoredAuth()).toBe("boolean");
  });

  test("matches action-scoped network evidence without accepting excluded endpoints", () => {
    const expectation: ExpectedNetworkAction = {
      actionName: "leads.create",
      urlPattern: /\/api\/v1\/leads(?:[/?]|$)/,
      excludeUrlPattern: /\/api\/v1\/leads\/search(?:\?|$)/,
      methods: ["POST"],
      expectedStatusMin: 200,
      expectedStatusMax: 299,
      timeoutMs: 1_000
    };
    expect(networkEvidenceMatches({
      method: "POST",
      url: "https://zoyo-crm-be.vercel.app/api/v1/leads",
      status: 201
    }, expectation)).toBe(true);
    expect(networkEvidenceSucceeded({ status: 201 }, expectation)).toBe(true);
    expect(networkEvidenceMatches({
      method: "POST",
      url: "https://zoyo-crm-be.vercel.app/api/v1/leads/search?query=QA",
      status: 200
    }, expectation)).toBe(false);
    expect(networkEvidenceSucceeded({ status: 422 }, expectation)).toBe(false);
  });
});
