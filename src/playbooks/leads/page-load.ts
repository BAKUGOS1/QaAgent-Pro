import { leadsBlueprintRequirements } from "../../blueprint/leads-blueprint.js";
import type { RunnerState } from "./runner-state.js";
import { pass, type ScenarioOutcome } from "./outcome-helpers.js";

export async function pageLoad(state: RunnerState): Promise<ScenarioOutcome> {
  const rows = await state.leads.rowCount();
  return pass(`Leads loaded at /inbox with ${rows} visible row(s).`, ["ui", "console"]);
}

export async function blueprintControls(state: RunnerState): Promise<ScenarioOutcome> {
  const controls = await state.leads.observeControls();
  const missing = leadsBlueprintRequirements
    .filter((requirement) => requirement.area === "toolbar")
    .filter((requirement) => !controls.find((control) => control.label === requirement.label)?.visible)
    .map((requirement) => requirement.label);
  if (missing.length) return {
    status: "Fail", category: "Feature Gap", severity: "Medium",
    actual: `Missing confirmed controls: ${missing.join(", ")}.`,
    expected: "All confirmed Leads toolbar controls are visible.",
    oracles: [
      { oracle: "ui", status: "fail", detail: `Missing: ${missing.join(", ")}` },
      { oracle: "blueprint", status: "fail", detail: "Confirmed blueprint controls are absent." }
    ]
  };
  return pass("All confirmed toolbar controls are visible.", ["ui", "blueprint"]);
}
