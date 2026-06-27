import type { RunnerState } from "./runner-state.js";
import { pass, fail, type ScenarioOutcome } from "./outcome-helpers.js";

export async function emptyValidation(state: RunnerState): Promise<ScenarioOutcome> {
  const text = await state.leads.submitEmpty();
  await state.leads.cancelDialog();
  const validation = /required|must|enter|invalid/i.test(text);
  return validation
    ? pass("Empty submit displayed validation and kept the dialog open.", ["ui"])
    : fail("No clear required-field validation was visible after empty submission.", "Functional Bug", ["ui"]);
}

export async function invalidField(
  state: RunnerState,
  kind: "mobile" | "email"
): Promise<ScenarioOutcome> {
  const dialog = await state.leads.openAddLead();
  await dialog.getByRole("textbox", { name: "Contact Name", exact: true }).fill("QA_INVALID");
  await dialog.getByRole("textbox", { name: "Business Name", exact: true }).fill("QA_INVALID_CO");
  if (kind === "mobile") await dialog.getByPlaceholder("Enter Contact Number", { exact: true }).fill("12");
  else await dialog.getByRole("textbox", { name: "Email", exact: true }).fill("invalid-email");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const stillOpen = await dialog.isVisible();
  const text = await dialog.innerText().catch(() => "");
  await state.leads.cancelDialog();
  return stillOpen && /invalid|valid|digit|email|number|required/i.test(text)
    ? pass(`Invalid ${kind} was rejected with visible feedback.`, ["ui"])
    : fail(`Invalid ${kind} did not produce clear field-level validation.`, "Functional Bug", ["ui"]);
}
