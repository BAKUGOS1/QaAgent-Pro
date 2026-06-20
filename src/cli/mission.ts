import fs from "node:fs";
import { Command } from "commander";
import { ZodError } from "zod";
import { prepareMission } from "../human-qa/orchestrator.js";
import { redactText } from "../shared/redaction.js";

const program = new Command()
  .name("qaagent-pro-mission")
  .requiredOption("--file <path>", "Path to a deterministic JSON mission file");

try {
  program.parse(process.argv);
  const options = program.opts<{ file: string }>();
  const input: unknown = JSON.parse(fs.readFileSync(options.file, "utf8"));
  const prepared = prepareMission(input);
  process.stdout.write(`${JSON.stringify(prepared, null, 2)}\n`);
} catch (error) {
  const message = error instanceof ZodError
    ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    : error instanceof Error ? error.message : String(error);
  process.stderr.write(`${redactText(message)}\n`);
  process.exitCode = 1;
}
