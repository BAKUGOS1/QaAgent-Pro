import type { RunnerState } from "./runner-state.js";
import { pass, fail, blocked, type ScenarioOutcome } from "./outcome-helpers.js";
import { searchableFixture } from "./search.js";

export async function convertLeadToDeal(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const fixture = searchableFixture(state);
  await state.leads.search(fixture.name);
  if (!await state.leads.hasLeadRow(fixture)) return blocked("Lead fixture is not available for conversion.");
  await state.leads.openLeadDetail(fixture);

  const dealName = `Deal from ${fixture.name}`;
  const success = await state.leads.convertToDeal(dealName);
  await state.page.keyboard.press("Escape").catch(() => {});

  if (!success) return blocked("Convert-to-deal control was not found or not visible in the detail view.");
  state.registry.add({
    entityType: "deal", uiIdentifier: dealName, createdByRun: true,
    currentState: "active"
  });
  return pass(`Lead converted to deal: "${dealName}".`, ["ui"]);
}

export async function archiveLeadScenario(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const fixture = searchableFixture(state);
  await state.leads.search(fixture.name);
  if (!await state.leads.hasLeadRow(fixture)) return blocked("Lead fixture is not available for archiving.");
  await state.leads.openLeadDetail(fixture);

  const success = await state.leads.archiveLead();
  await state.page.keyboard.press("Escape").catch(() => {});

  if (!success) return blocked("Archive button was not found or not visible in the detail view.");

  // Update entity state
  const entry = state.registry.all().find((e) => e.uiIdentifier === fixture.name);
  if (entry) entry.currentState = "archived";

  // Verify lead is no longer in inbox
  await state.leads.open(state.baseUrl);
  await state.leads.search(fixture.name);
  const stillInInbox = await state.leads.hasLeadRow(fixture);
  return !stillInInbox
    ? pass("Lead archived and removed from inbox.", ["ui"])
    : fail("Lead was archived but still appears in inbox.", "Functional Bug", ["ui"]);
}

export async function archivedReadOnly(state: RunnerState): Promise<ScenarioOutcome> {
  const fixture = searchableFixture(state);
  await state.leads.open(state.baseUrl);
  await state.leads.switchToArchiveTab();
  await state.leads.search(fixture.name);
  if (!await state.leads.hasLeadRow(fixture)) return blocked("Lead is not visible in the Archive tab for read-only verification.");
  await state.leads.openLeadDetail(fixture);

  const result = await state.leads.verifyArchivedReadOnly();
  await state.page.keyboard.press("Escape").catch(() => {});
  await state.leads.switchToInboxTab();

  return result.isReadOnly
    ? pass(`Archived lead is in read-only state. ${result.details}`, ["ui"])
    : fail(`Archived lead is not fully read-only. ${result.details}`, "Functional Bug", ["ui"]);
}

export async function unarchiveLeadScenario(state: RunnerState): Promise<ScenarioOutcome> {
  const fixture = searchableFixture(state);
  await state.leads.open(state.baseUrl);
  await state.leads.switchToArchiveTab();
  await state.leads.search(fixture.name);
  if (!await state.leads.hasLeadRow(fixture)) return blocked("Lead is not visible in the Archive tab for unarchiving.");
  await state.leads.openLeadDetail(fixture);

  const success = await state.leads.unarchiveLead();
  await state.page.keyboard.press("Escape").catch(() => {});

  if (!success) return blocked("Unarchive button was not found in the archived lead detail view.");

  // Update entity state
  const entry = state.registry.all().find((e) => e.uiIdentifier === fixture.name);
  if (entry) entry.currentState = "inbox";

  // Verify lead returned to inbox
  await state.leads.switchToInboxTab();
  await state.leads.search(fixture.name);
  const restoredInInbox = await state.leads.hasLeadRow(fixture);
  return restoredInInbox
    ? pass("Lead unarchived and restored to inbox.", ["ui"])
    : fail("Lead was unarchived but not found in inbox.", "Functional Bug", ["ui"]);
}

export async function bulkArchiveScenario(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const selectedCount = await state.leads.bulkSelectRows(2);
  if (selectedCount === 0) return blocked("No rows with checkboxes were found for bulk selection.");

  const archiveBtn = state.page.getByRole("button", { name: /Archive/i }).first();
  if (await archiveBtn.count() === 0 || !await archiveBtn.isVisible().catch(() => false)) {
    return blocked("Bulk archive button did not appear after selecting rows.");
  }
  await archiveBtn.click();

  const dialog = state.page.getByRole("dialog");
  if (await dialog.count() > 0 && await dialog.isVisible().catch(() => false)) {
    const confirmBtn = dialog.getByRole("button", { name: /Archive|Confirm|Yes/i }).first();
    if (await confirmBtn.count() > 0) await confirmBtn.click();
    await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  }

  return pass(`Bulk archive triggered for ${selectedCount} selected row(s).`, ["ui"]);
}
