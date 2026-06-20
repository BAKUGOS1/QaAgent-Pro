import { Command } from "commander";
import { qaModes, type QaMode } from "../shared/types.js";

export interface CliOptions {
  mode: QaMode;
  visibleMarkers: string[];
}

export function parseCli(argv = process.argv): CliOptions {
  const program = new Command();
  program
    .name("qaagent-pro")
    .description("Deterministic Zybra CRM QA runner")
    .option("--mode <mode>", `QA mode: ${qaModes.join(", ")}`, "blueprint")
    .option("--visible-marker <marker...>", "Visible staging/test marker captured by a later browser phase", []);
  program.parse(argv);
  const options = program.opts<{ mode: string; visibleMarker: string[] }>();
  if (!qaModes.includes(options.mode as QaMode)) {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }
  return { mode: options.mode as QaMode, visibleMarkers: options.visibleMarker };
}
