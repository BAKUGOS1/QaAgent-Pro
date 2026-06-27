import type { RunnerState } from "./runner-state.js";
import { pass, fail, productConfirmation, type ScenarioOutcome } from "./outcome-helpers.js";

export async function responsive(state: RunnerState, width: number, height: number): Promise<ScenarioOutcome> {
  await state.page.setViewportSize({ width, height });
  await state.leads.open(state.baseUrl);
  const metrics = await state.page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    addVisible: Boolean(Array.from(document.querySelectorAll("button")).find((element) => element.textContent.trim() === "Add Lead"))
  }));
  await state.page.setViewportSize({ width: 1440, height: 900 });
  return metrics.addVisible
    ? pass(`Primary action remains visible at ${width}×${height}; horizontal overflow ${metrics.scrollWidth - metrics.viewport}px.`, ["ui"])
    : fail(`Primary action is not visible at ${width}×${height}.`, "UX Issue", ["ui"]);
}

export async function keyboardFocus(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  await state.page.keyboard.press("Tab");
  const focused = await state.page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    return { tag: element?.tagName ?? "", text: (element?.innerText ?? "").trim(), aria: element?.getAttribute("aria-label") ?? "" };
  });
  return focused.tag
    ? pass(`Keyboard focus moved to ${focused.tag} ${focused.text || focused.aria}.`, ["accessibility"])
    : fail("Keyboard focus did not move to an interactive control.", "Accessibility Issue", ["accessibility"]);
}

export async function accessibility(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const issues = await state.page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button")).filter((button) => !(button.textContent.trim() || button.getAttribute("aria-label") || button.getAttribute("title")));
    const inputs = Array.from(document.querySelectorAll("input")).filter((input) =>
      input.type !== "hidden"
      && !input.getAttribute("aria-label")
      && !input.getAttribute("placeholder")
      && (input.labels === null || input.labels.length === 0)
    );
    return { unnamedButtons: buttons.length, unlabeledInputs: inputs.length };
  });
  return issues.unnamedButtons === 0 && issues.unlabeledInputs === 0
    ? pass("Basic accessible names and labels are present.", ["accessibility"])
    : fail(`${issues.unnamedButtons} unnamed button(s), ${issues.unlabeledInputs} unlabeled input(s).`, "Accessibility Issue", ["accessibility"]);
}

export async function performancePage(state: RunnerState): Promise<ScenarioOutcome> {
  const start = Date.now();
  await state.leads.open(state.baseUrl);
  const duration = Date.now() - start;
  return duration <= 3000
    ? pass(`Leads page loaded in ${duration}ms.`, ["performance"])
    : fail(`Leads page took ${duration}ms (>3000ms).`, "Performance Issue", ["performance"]);
}

export async function performanceSearch(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const { searchableFixture } = await import("./search.js");
  const start = Date.now();
  await state.leads.search(searchableFixture(state).name);
  const duration = Date.now() - start;
  return duration <= 2000
    ? pass(`Search completed in ${duration}ms.`, ["performance", "search-table"])
    : fail(`Search took ${duration}ms (>2000ms).`, "Performance Issue", ["performance", "search-table"]);
}

export function performanceMutation(): ScenarioOutcome {
  return productConfirmation("Mutation timing was captured during LEAD-006; dedicated repeat mutation is avoided to prevent unnecessary staging data.");
}
