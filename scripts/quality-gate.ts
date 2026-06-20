import { spawnSync } from "node:child_process";
import path from "node:path";

const commands: Array<[string, string[]]> = [
  ["tsx", ["scripts/verify-product-inputs.ts"]],
  ["tsc", ["--noEmit"]],
  ["eslint", ["."]],
  ["vitest", ["run", "--coverage"]],
  ["tsx", ["scripts/scan-secrets.ts"]],
  ["vitest", ["run", "tests/unit/workbook.test.ts"]],
  ["playwright", ["test", "--list"]]
];

for (const [command, args] of commands) {
  process.stdout.write(`\n> ${command} ${args.join(" ")}\n`);
  const binary = path.join(process.cwd(), "node_modules", ".bin", command);
  const result = spawnSync(binary, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${path.dirname(process.execPath)}:${process.env.PATH ?? ""}`
    },
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (!process.exitCode) process.stdout.write("\nQaAgent-Pro quality gate passed.\n");
