import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { EvidenceRecorder, sanitizeUrl } from "../../src/browser/evidence-recorder.js";
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
});
