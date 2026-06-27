import type { LeadFixture } from "../../leads/types.js";
import type { RunnerState } from "./runner-state.js";
import { pass, fail, type ScenarioOutcome } from "./outcome-helpers.js";

function searchableFixture(state: RunnerState): LeadFixture {
  return state.registry.all().some((entry) => entry.uiIdentifier === state.fixture.name)
    ? state.fixture
    : state.baseline;
}

export async function searchCase(state: RunnerState, value: string): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  await state.leads.search(value);
  const found = await state.leads.hasText(value);
  return found
    ? pass(`Search returned ${value}.`, ["ui", "search-table"])
    : fail(`Search did not return ${value}.`, "Functional Bug", ["ui", "search-table"]);
}

export async function searchByName(state: RunnerState): Promise<ScenarioOutcome> {
  return searchCase(state, searchableFixture(state).name);
}

export async function searchByCompany(state: RunnerState): Promise<ScenarioOutcome> {
  return searchCase(state, searchableFixture(state).company);
}

export async function searchByMobile(state: RunnerState): Promise<ScenarioOutcome> {
  return searchCase(state, searchableFixture(state).mobile);
}

export async function searchByEmail(state: RunnerState): Promise<ScenarioOutcome> {
  return searchCase(state, searchableFixture(state).email);
}

export async function noResults(state: RunnerState): Promise<ScenarioOutcome> {
  await state.leads.open(state.baseUrl);
  const query = `NO_RESULT_${Date.now()}`;
  await state.leads.search(query).catch(() => {});
  const body = await state.page.locator("body").innerText();
  return /no data|no result|0 of 0|no leads/i.test(body)
    ? pass("No-results state is visible and understandable.", ["ui"])
    : fail("Search no-results state lacks clear guidance.", "UX Issue", ["ui"]);
}

export { searchableFixture };
