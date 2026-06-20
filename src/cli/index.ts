import { ZodError } from "zod";
import { loadConfig } from "../config/load.js";
import { redactText } from "../shared/redaction.js";
import { parseCli } from "./options.js";
import { buildRunManifest } from "./run.js";

try {
  const options = parseCli();
  const config = loadConfig();
  const manifest = buildRunManifest(config, options);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write("CRM execution is not implemented in Phase 1; no browser was opened.\n");
} catch (error) {
  const message = error instanceof ZodError
    ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    : error instanceof Error ? error.message : String(error);
  process.stderr.write(`${redactText(message)}\n`);
  process.exitCode = 1;
}
