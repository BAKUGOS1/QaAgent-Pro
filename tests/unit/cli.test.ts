import { describe, expect, test } from "vitest";
import { parseConfig } from "../../src/config/load.js";
import { parseCli } from "../../src/cli/options.js";
import { buildRunManifest } from "../../src/cli/run.js";

describe("CLI foundation", () => {
  test("parses deterministic modes", () => {
    expect(parseCli(["node", "qa", "--mode", "leads"]).mode).toBe("leads");
    expect(parseCli(["node", "qa", "--mode", "full-destructive"]).mode).toBe("full-destructive");
  });

  test("rejects unsupported modes", () => {
    expect(() => parseCli(["node", "qa", "--mode", "crawler"])).toThrow("Unsupported mode");
  });

  test("returns read-only Phase 1 manifest without verified environment", () => {
    const manifest = buildRunManifest(parseConfig({}), {
      mode: "leads",
      visibleMarkers: []
    });
    expect(manifest).toMatchObject({
      mode: "leads",
      access: "read-only",
      safetyProfile: "read-only-audit",
      phase: 1
    });
  });
});
