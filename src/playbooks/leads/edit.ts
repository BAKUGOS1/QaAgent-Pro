import type { RunnerState } from "./runner-state.js";
import { pass, fail, blocked, type ScenarioOutcome } from "./outcome-helpers.js";
import { searchableFixture } from "./search.js";

interface EditSpec {
  scenarioId: string;
  fieldLabel: string;
  newValue: string;
  description: string;
}

const editSpecs: EditSpec[] = [
  { scenarioId: "LEAD-013", fieldLabel: "Label", newValue: "WARM", description: "Edit label" },
  { scenarioId: "LEAD-014", fieldLabel: "Owner", newValue: "Admin", description: "Edit owner" },
  { scenarioId: "LEAD-015", fieldLabel: "Value", newValue: "99999", description: "Edit value" },
  { scenarioId: "LEAD-016", fieldLabel: "Expected Close Date", newValue: "15/12/2026", description: "Edit expected close date" },
  { scenarioId: "LEAD-017", fieldLabel: "Source Channel", newValue: "Referral", description: "Edit source channel" }
];

export async function editField(state: RunnerState, scenarioId: string): Promise<ScenarioOutcome> {
  const spec = editSpecs.find((item) => item.scenarioId === scenarioId);
  if (!spec) return blocked(`No edit spec found for ${scenarioId}.`);

  await state.leads.open(state.baseUrl);
  const fixture = searchableFixture(state);
  await state.leads.search(fixture.name);
  if (!await state.leads.hasLeadRow(fixture)) return blocked(`Lead fixture ${fixture.name} is not available for editing.`);
  await state.leads.openLeadDetail(fixture);

  const result = await state.leads.editFieldInDetail(spec.fieldLabel, spec.newValue);
  await state.page.keyboard.press("Escape").catch(() => {});

  if (!result.found) {
    return blocked(`${spec.description}: The ${spec.fieldLabel} edit control was not found in the detail view. The CRM may use a different UI pattern.`);
  }
  if (!result.saved) {
    return fail(`${spec.description}: Field was found and edited but save did not complete.`, "Functional Bug", ["ui"]);
  }

  // Verify persistence: reload and check
  await state.leads.open(state.baseUrl);
  await state.leads.search(fixture.name);
  await state.leads.openLeadDetail(fixture);
  const bodyText = await state.page.locator("body").innerText();
  await state.page.keyboard.press("Escape").catch(() => {});

  const persisted = bodyText.includes(spec.newValue);
  return persisted
    ? pass(`${spec.description}: Changed to ${spec.newValue} and verified after reload.`, ["ui", "persistence"])
    : fail(`${spec.description}: Changed to ${spec.newValue} but value was not visible after reload.`, "Data Integrity Issue", ["ui", "persistence"]);
}

export async function addNote(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const fixture = searchableFixture(state);
  await state.leads.search(fixture.name);
  if (!await state.leads.hasLeadRow(fixture)) return blocked("Lead fixture is not available for note addition.");
  await state.leads.openLeadDetail(fixture);

  const noteText = `QA note ${state.runId} at ${new Date().toISOString()}`;
  const success = await state.leads.addNoteInDetail(noteText);
  await state.page.keyboard.press("Escape").catch(() => {});

  return success
    ? pass(`Note added: "${noteText}".`, ["ui"])
    : blocked("Note input control was not found in the lead detail view.");
}

export async function scheduleActivity(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const fixture = searchableFixture(state);
  await state.leads.search(fixture.name);
  if (!await state.leads.hasLeadRow(fixture)) return blocked("Lead fixture is not available for activity scheduling.");
  await state.leads.openLeadDetail(fixture);

  const activityDesc = `QA activity ${state.runId}`;
  const success = await state.leads.scheduleActivityInDetail(activityDesc);
  await state.page.keyboard.press("Escape").catch(() => {});

  return success
    ? pass(`Activity scheduled: "${activityDesc}".`, ["ui"])
    : blocked("Activity scheduling control was not found in the lead detail view.");
}
