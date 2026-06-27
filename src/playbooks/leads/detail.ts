import type { RunnerState } from "./runner-state.js";
import { pass, blocked, productConfirmation, type ScenarioOutcome } from "./outcome-helpers.js";
import { searchableFixture } from "./search.js";

export async function detailObservation(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const targetFixture = searchableFixture(state);
  await state.leads.search(targetFixture.name);
  if (!await state.leads.hasLeadRow(targetFixture)) return blocked("A stable lead row is unavailable for detail inspection.");
  await state.leads.openLeadDetail(targetFixture);
  const body = await state.page.locator("body").innerText();
  const found = /Details|History|Focus|Activity|Note/i.test(body);
  await state.page.keyboard.press("Escape").catch(() => {});
  return found
    ? pass("Lead detail surface exposed details/history/activity controls.", ["ui"])
    : productConfirmation("Lead opened, but the expected detail contract was not exposed semantically.");
}
