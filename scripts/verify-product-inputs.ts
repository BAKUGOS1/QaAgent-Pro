import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const expectedProductInputs = {
  "QaAgent-Pro_PRD_TDD_Refresh_v2.pdf": "3f55944df91110d722e4814335a04bc8401084f40ff8aa18d398af04ab4d6ebb",
  "crm.excalidraw": "55a73aa050bd236fe7b2d8b90f3997a19ab3ff546a3f2870496a7f419c166371"
} as const;

export function sha256(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function verifyProductInputs(root = process.cwd()): string[] {
  const failures: string[] = [];
  for (const [fileName, expected] of Object.entries(expectedProductInputs)) {
    const filePath = path.join(root, "docs", "product-inputs", fileName);
    if (!fs.existsSync(filePath)) {
      failures.push(`${fileName}: missing`);
      continue;
    }
    const actual = sha256(filePath);
    if (actual !== expected) failures.push(`${fileName}: expected ${expected}, received ${actual}`);
  }
  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = verifyProductInputs();
  if (failures.length > 0) {
    process.stderr.write(`${failures.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("Product input checksums verified.\n");
  }
}
