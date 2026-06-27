import type { RunnerState } from "./runner-state.js";
import { pass, fail, productConfirmation, type ScenarioOutcome } from "./outcome-helpers.js";

export async function featureGap(state: RunnerState, label: string, note = ""): Promise<ScenarioOutcome> {
  const controls = await state.leads.observeControls();
  const visible = controls.find((control) => control.label === label)?.visible;
  return visible
    ? pass(`${label} is visible. ${note}`.trim(), ["ui", "blueprint"])
    : fail(`${label} is missing from the current Leads toolbar. ${note}`.trim(), "Feature Gap", ["ui", "blueprint"]);
}

export function manageColumnsPersistence(): ScenarioOutcome {
  return productConfirmation("Manage Columns is not visible, so preference persistence cannot be exercised.");
}
