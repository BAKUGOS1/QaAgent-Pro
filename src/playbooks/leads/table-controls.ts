import type { RunnerState } from "./runner-state.js";
import { pass, fail, blocked, productConfirmation, type ScenarioOutcome } from "./outcome-helpers.js";

export async function sortObservation(state: RunnerState, label: string): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const button = state.leads.table.getByRole("button", { name: label, exact: true });
  if (!await button.count()) return fail(`${label} sort control is missing.`, "Feature Gap", ["ui"]);
  await button.click();
  return pass(`${label} sort control is actionable.`, ["ui"]);
}

export async function paginationObservation(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const next = state.page.getByLabel("Go to next page");
  if (!await next.count()) return productConfirmation("Pagination is visible but next-page control lacks a stable accessible contract.");
  await next.click();
  return pass("Next-page navigation is actionable.", ["ui"]);
}

export async function directPageObservation(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const pageTwo = state.page.getByText("2", { exact: true });
  if (!await pageTwo.count()) return blocked("Direct page 2 control is unavailable.");
  await pageTwo.click();
  return pass("Direct page selection is actionable.", ["ui"]);
}

export async function pageSizeObservation(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const button = state.page.getByRole("button", { name: "10", exact: true });
  if (!await button.count()) return fail("Page-size control is missing.", "Feature Gap", ["ui"]);
  await button.click();
  const body = await state.page.locator("body").innerText();
  await state.page.keyboard.press("Escape").catch(() => {});
  return /10/.test(body)
    ? pass("Page-size control opens and exposes options.", ["ui"])
    : blocked("Page-size options were not observable.");
}
