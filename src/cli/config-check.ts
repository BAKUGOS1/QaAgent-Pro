import { ZodError } from "zod";
import { configSummary, loadConfig } from "../config/load.js";
import { redactText } from "../shared/redaction.js";

try {
  const config = loadConfig();
  process.stdout.write(`${JSON.stringify(configSummary(config), null, 2)}\n`);
  process.stdout.write("Configuration schema is valid. Missing mutation gates will force read-only mode.\n");
} catch (error) {
  const message = error instanceof ZodError
    ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    : error instanceof Error ? error.message : String(error);
  process.stderr.write(`${redactText(message)}\n`);
  process.exitCode = 1;
}
