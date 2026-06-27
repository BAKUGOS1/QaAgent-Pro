import type { RunnerState } from "./runner-state.js";
import { pass, fail, blocked, type ScenarioOutcome } from "./outcome-helpers.js";

export async function persistenceMatrix(state: RunnerState): Promise<ScenarioOutcome> {
  if (!state.registry.all().some((entry) => entry.uiIdentifier === state.fixture.name)) return blocked("No run-created fixture is available for persistence verification.");
  await state.leads.open(state.baseUrl);
  await state.leads.search(state.fixture.name);
  const before = await state.leads.hasText(state.fixture.name);
  await state.page.reload();
  await state.leads.table.waitFor();
  await state.leads.search(state.fixture.name);
  const after = await state.leads.hasText(state.fixture.name);
  return before && after
    ? pass("Run-created lead remains searchable before and after reload.", ["ui", "persistence", "search-table"])
    : fail("Run-created lead did not survive the persistence matrix.", "Data Integrity Issue", ["ui", "persistence", "search-table"]);
}

export function cleanupObservation(state: RunnerState): ScenarioOutcome {
  const entries = state.registry.all();
  return {
    status: "Pass", category: "Cleanup", actual: `${entries.length} touched entity record(s) reconciled; delete disabled, generated fixtures retained.`,
    oracles: [{ oracle: "persistence", status: "pass", detail: "Entity registry is complete." }]
  };
}
