import type { RunnerState } from "./runner-state.js";
import { pass, fail, productConfirmation, type ScenarioOutcome } from "./outcome-helpers.js";

export async function filterObservation(state: RunnerState, id: string): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  await state.leads.filterButton.click();
  const body = await state.page.locator("body").innerText();
  await state.page.keyboard.press("Escape").catch(() => {});
  const labels: Record<string, string> = {
    "LEAD-028": "Owner", "LEAD-029": "Label", "LEAD-030": "City",
    "LEAD-031": "Activity Date", "LEAD-032": "Source Channel",
    "LEAD-033": "Leads with No Activity", "LEAD-034": "Leads with Overdue Activity"
  };
  if (id === "LEAD-035" || id === "LEAD-036") return productConfirmation("Filter panel is available; combined-filter AND logic and refresh/reset persistence need confirmed option-level contracts.");
  const label = labels[id] ?? "";
  return body.includes(label)
    ? pass(`${label} filter is available.`, ["ui"])
    : fail(`${label} filter is missing.`, "Feature Gap", ["ui", "blueprint"]);
}
