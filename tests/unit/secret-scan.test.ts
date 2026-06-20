import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { scanSecrets } from "../../scripts/scan-secrets.js";

describe("repository secret scan", () => {
  test("passes the current repository", () => {
    expect(scanSecrets()).toEqual([]);
  });

  test("detects hardcoded credentials", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qap-secret-"));
    fs.writeFileSync(path.join(directory, "bad.ts"), 'const CRM_PASSWORD = "unsafe";\n');
    expect(scanSecrets(directory)).toHaveLength(1);
  });
});
