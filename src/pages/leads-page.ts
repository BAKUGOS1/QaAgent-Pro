import { expect, type Locator, type Page } from "@playwright/test";
import type { LeadFixture, LeadSaveUiOutcome, ObservedControl } from "../leads/types.js";

export class LeadsPage {
  readonly table: Locator;
  readonly addLeadButton: Locator;
  readonly filterButton: Locator;
  readonly searchButton: Locator;

  constructor(private readonly page: Page) {
    this.table = page.getByRole("table");
    this.addLeadButton = page.getByRole("button", { name: "Add Lead", exact: true });
    this.filterButton = page.getByRole("button", { name: "Filter", exact: true });
    this.searchButton = page.getByRole("button", { name: "Open search", exact: true });
  }

  async open(baseUrl: string): Promise<void> {
    await this.page.goto(new URL("/inbox", baseUrl).toString());
    await expect(this.table).toBeVisible({ timeout: 20_000 });
  }

  async observeControls(): Promise<ObservedControl[]> {
    const labels = ["Inbox", "Archive", "Filter", "Search", "Add Lead", "Import Data", "Export Data", "Manage Columns"];
    return Promise.all(labels.map(async (label) => {
      const locator = label === "Search"
        ? this.searchButton
        : this.page.getByText(label, { exact: true });
      return { label, visible: await locator.count() > 0 && await locator.first().isVisible() };
    }));
  }

  async headers(): Promise<string[]> {
    return (await this.table.locator("th").allTextContents()).map((text) => text.trim()).filter(Boolean);
  }

  async rowCount(): Promise<number> {
    return Math.max(0, await this.table.getByRole("row").count() - 1);
  }

  async firstRowData(): Promise<{ company: string; name: string; mobile: string; email: string }> {
    const map = await this.firstRowDataByHeaders();
    return {
      company: map["Company Name"] ?? map["company"] ?? "",
      name: map["Name"] ?? map["name"] ?? "",
      mobile: map["Mobile Numbers"] ?? map["Mobile"] ?? map["mobile"] ?? "",
      email: map["Emails"] ?? map["Email"] ?? map["email"] ?? ""
    };
  }

  async firstRowDataByHeaders(): Promise<Record<string, string>> {
    const headerList = await this.headers();
    const cells = await this.table.getByRole("row").nth(1).getByRole("cell").allTextContents();
    const map: Record<string, string> = {};
    headerList.forEach((header, index) => {
      const cellValue = cells[index + 1]?.trim();
      if (cellValue !== undefined) {
        map[header] = cellValue;
      }
    });
    return map;
  }

  async openAddLead(): Promise<Locator> {
    await this.addLeadButton.click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async cancelDialog(): Promise<void> {
    const cancel = this.page.getByRole("button", { name: "Cancel", exact: true });
    if (await cancel.count()) await cancel.click();
  }

  async submitEmpty(): Promise<string> {
    const dialog = await this.openAddLead();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    return dialog.innerText();
  }

  async fillLead(fixture: LeadFixture): Promise<void> {
    const dialog = await this.openAddLead();
    await dialog.getByRole("textbox", { name: "Contact Name", exact: true }).fill(fixture.name);
    await dialog.getByRole("textbox", { name: "Business Name", exact: true }).fill(fixture.company);
    await dialog.getByPlaceholder("Enter Contact Number", { exact: true }).fill(fixture.mobile);
    await dialog.getByRole("textbox", { name: "Email", exact: true }).fill(fixture.email);
    await dialog.getByRole("textbox", { name: "Value", exact: true }).fill(fixture.value);
    await this.fillCloseDateIfPresent(dialog);
    const tagInput = dialog.locator("input[cmdk-input]");
    await tagInput.click();
    await this.page.locator("[cmdk-item]").filter({ hasText: "HOT" }).first().click();
    await dialog.getByRole("heading", { name: "Add Lead", exact: true }).click({ force: true });
    await this.selectFirstProductIfPresent(dialog);
    await dialog.getByPlaceholder("Select Source Channel Type", { exact: true }).click();
    await this.page.getByText("Website", { exact: true }).last().click();
    const owner = dialog.getByRole("combobox").filter({ hasText: "Select owner" });
    await owner.click();
    await this.page.getByRole("option").first().click();
    await dialog.getByRole("heading", { name: "Add Lead", exact: true }).click({ force: true });

    // Handle Address fields if the Address tab is present (required for some tenants like XYZ org)
    const addressTab = dialog.locator("[role='tab']:has-text('Address'), button:has-text('Address')").first();
    if (await addressTab.count() > 0 && await addressTab.isVisible()) {
      await addressTab.click();
      const countryBtn = dialog.getByRole("combobox").filter({ hasText: "Select Country" });
      await countryBtn.click();
      await this.page.getByRole("option", { name: "Argentina" }).first().click();
      const stateBtn = dialog.getByRole("combobox").filter({ hasText: "Select State" });
      await stateBtn.click();
      await this.page.getByRole("option", { name: "Buenos Aires" }).first().click();
      await dialog.locator('input[name="address.city"]').fill("La Plata");
      await dialog.locator('textarea[name="address.streetAddress"]').fill("Calle 123");
      await dialog.locator('input[name="address.zipCode"]').fill("1900");
      const otherDetailsTab = dialog.locator("[role='tab']:has-text('Other Details'), button:has-text('Other Details')").first();
      if (await otherDetailsTab.count() > 0) await otherDetailsTab.click();
    }
  }

  async clickSaveLead(): Promise<void> {
    await this.page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  }

  async saveLead(): Promise<LeadSaveUiOutcome> {
    await this.clickSaveLead();
    return this.observeSaveOutcome();
  }

  async observeSaveOutcome(timeoutMs = 5_000): Promise<LeadSaveUiOutcome> {
    const dialog = this.page.getByRole("dialog");
    const hidden = await dialog.waitFor({ state: "hidden", timeout: timeoutMs }).then(() => true).catch(() => false);
    if (hidden) return { state: "closed", validationMessages: [] };
    const msgs = await this.validationMessages();
    return msgs.length > 0
      ? { state: "validation-visible", validationMessages: msgs }
      : { state: "still-open", validationMessages: msgs };
  }

  async search(value: string): Promise<void> {
    await this.searchButton.click();
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="Search" i]').first();
    await searchInput.fill(value);
    await expect(this.table).toContainText(value, { ignoreCase: true });
  }

  async clearSearch(): Promise<void> {
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="Search" i]').first();
    if (await searchInput.count()) await searchInput.fill("");
  }

  async hasText(value: string): Promise<boolean> {
    return (await this.table.getByText(value, { exact: false }).count()) > 0;
  }

  rowByLead(fixture: Pick<LeadFixture, "name" | "company" | "email" | "mobile">): Locator {
    const rows = this.table.getByRole("row").filter({ hasText: fixture.name });
    return rows.filter({ hasText: fixture.company }).first();
  }

  async hasLeadRow(fixture: Pick<LeadFixture, "name" | "company" | "email" | "mobile">): Promise<boolean> {
    return await this.rowByLead(fixture).count() > 0;
  }

  async openLeadDetail(fixture: Pick<LeadFixture, "name" | "company" | "email" | "mobile">): Promise<void> {
    const row = this.rowByLead(fixture);
    if (await row.count() === 0) throw new Error(`No deterministic row found for ${fixture.name}.`);
    const preferredCell = row.getByRole("cell").filter({ hasText: fixture.company }).first();
    if (await preferredCell.count() > 0) await preferredCell.click();
    else await row.getByRole("cell").nth(1).click();
  }

  // ---- Edit operations (LEAD-013–017) ----

  async editFieldInDetail(fieldLabel: string, newValue: string): Promise<{ found: boolean; saved: boolean; bodyText: string }> {
    const editButton = this.page.getByRole("button", { name: "Edit", exact: true });
    if (await editButton.count() > 0 && await editButton.first().isVisible()) {
      await editButton.first().click();
      const dialog = this.page.getByRole("dialog");
      if (await dialog.count() > 0) {
        const field = dialog.getByRole("textbox", { name: fieldLabel }).first();
        const combobox = dialog.getByRole("combobox").filter({ hasText: fieldLabel }).first();
        if (await field.count() > 0) {
          await field.fill(newValue);
          const saveBtn = dialog.getByRole("button", { name: "Save", exact: true });
          if (await saveBtn.count() > 0) await saveBtn.click();
          const hidden = await dialog.waitFor({ state: "hidden", timeout: 5_000 }).then(() => true).catch(() => false);
          return { found: true, saved: hidden, bodyText: await this.page.locator("body").innerText() };
        } else if (await combobox.count() > 0) {
          await combobox.click();
          const option = this.page.getByRole("option").filter({ hasText: newValue }).first();
          if (await option.count() > 0) await option.click();
          const saveBtn = dialog.getByRole("button", { name: "Save", exact: true });
          if (await saveBtn.count() > 0) await saveBtn.click();
          const hidden = await dialog.waitFor({ state: "hidden", timeout: 5_000 }).then(() => true).catch(() => false);
          return { found: true, saved: hidden, bodyText: await this.page.locator("body").innerText() };
        }
        await this.page.getByRole("button", { name: "Cancel", exact: true }).click().catch(() => {});
        return { found: false, saved: false, bodyText: "" };
      }
    }
    const inlineField = this.page.locator(`[data-field="${fieldLabel}"], [aria-label="${fieldLabel}"]`).first();
    if (await inlineField.count() > 0) {
      await inlineField.dblclick();
      const activeInput = this.page.locator("input:focus, textarea:focus, [contenteditable]:focus").first();
      if (await activeInput.count() > 0) {
        await activeInput.fill(newValue);
        await activeInput.press("Enter");
        return { found: true, saved: true, bodyText: await this.page.locator("body").innerText() };
      }
    }
    return { found: false, saved: false, bodyText: "" };
  }

  // ---- Note and Activity (LEAD-018–019) ----

  async addNoteInDetail(text: string): Promise<boolean> {
    const noteTab = this.page.locator("[role='tab']:has-text('Note'), button:has-text('Note'), [role='tab']:has-text('Notes')").first();
    if (await noteTab.count() > 0 && await noteTab.isVisible()) {
      await noteTab.click();
      await this.page.waitForTimeout(300);
    }
    const noteInput = this.page.locator("textarea, input[placeholder*='note' i], input[placeholder*='comment' i], [contenteditable]").first();
    if (await noteInput.count() === 0) return false;
    await noteInput.fill(text);
    const saveButton = this.page.getByRole("button", { name: /Save|Add Note|Post|Submit/i }).first();
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await this.page.waitForTimeout(500);
    }
    return true;
  }

  async scheduleActivityInDetail(description: string): Promise<boolean> {
    const activityTab = this.page.locator("[role='tab']:has-text('Activity'), button:has-text('Activity'), [role='tab']:has-text('Activities')").first();
    if (await activityTab.count() > 0 && await activityTab.isVisible()) {
      await activityTab.click();
      await this.page.waitForTimeout(300);
    }
    const addActivity = this.page.getByRole("button", { name: /Add Activity|Schedule|New Activity/i }).first();
    if (await addActivity.count() === 0) return false;
    await addActivity.click();
    const dialog = this.page.getByRole("dialog");
    if (await dialog.count() === 0) return false;
    const descInput = dialog.locator("textarea, input[placeholder*='description' i], input[placeholder*='title' i]").first();
    if (await descInput.count() > 0) await descInput.fill(description);
    const saveBtn = dialog.getByRole("button", { name: /Save|Schedule|Add/i }).first();
    if (await saveBtn.count() > 0) await saveBtn.click();
    await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    return true;
  }

  // ---- Lifecycle (LEAD-023–027) ----

  async convertToDeal(dealName: string): Promise<boolean> {
    const convertBtn = this.page.getByRole("button", { name: /Convert|Create Deal/i }).first();
    if (await convertBtn.count() === 0 || !await convertBtn.isVisible().catch(() => false)) return false;
    await convertBtn.click();
    const dialog = this.page.getByRole("dialog");
    if (await dialog.count() > 0) {
      const dealNameInput = dialog.getByRole("textbox", { name: /Deal Name/i }).first();
      if (await dealNameInput.count() > 0) await dealNameInput.fill(dealName);
      const confirmBtn = dialog.getByRole("button", { name: /Convert|Save|Confirm/i }).first();
      if (await confirmBtn.count() > 0) await confirmBtn.click();
      await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    }
    return true;
  }

  async archiveLead(): Promise<boolean> {
    const archiveBtn = this.page.getByRole("button", { name: /Archive/i }).first();
    if (await archiveBtn.count() === 0 || !await archiveBtn.isVisible().catch(() => false)) return false;
    await archiveBtn.click();
    const dialog = this.page.getByRole("dialog");
    if (await dialog.count() > 0 && await dialog.isVisible().catch(() => false)) {
      const confirmBtn = dialog.getByRole("button", { name: /Archive|Confirm|Yes/i }).first();
      if (await confirmBtn.count() > 0) await confirmBtn.click();
      await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    }
    return true;
  }

  async unarchiveLead(): Promise<boolean> {
    const unarchiveBtn = this.page.getByRole("button", { name: /Unarchive|Restore/i }).first();
    if (await unarchiveBtn.count() === 0 || !await unarchiveBtn.isVisible().catch(() => false)) return false;
    await unarchiveBtn.click();
    const dialog = this.page.getByRole("dialog");
    if (await dialog.count() > 0 && await dialog.isVisible().catch(() => false)) {
      const confirmBtn = dialog.getByRole("button", { name: /Unarchive|Confirm|Yes|Restore/i }).first();
      if (await confirmBtn.count() > 0) await confirmBtn.click();
      await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    }
    return true;
  }

  async verifyArchivedReadOnly(): Promise<{ isReadOnly: boolean; details: string }> {
    const body = await this.page.locator("body").innerText();
    const editBtn = this.page.getByRole("button", { name: "Edit", exact: true });
    const deleteBtn = this.page.getByRole("button", { name: /Delete/i }).first();
    const editVisible = await editBtn.count() > 0 && await editBtn.isVisible().catch(() => false);
    const deleteVisible = await deleteBtn.count() > 0 && await deleteBtn.isVisible().catch(() => false);
    const hasArchiveIndicator = /archived|read.only/i.test(body);
    return {
      isReadOnly: !editVisible && !deleteVisible && hasArchiveIndicator,
      details: `Edit: ${editVisible ? "visible" : "hidden"}, Delete: ${deleteVisible ? "visible" : "hidden"}, Indicator: ${hasArchiveIndicator ? "present" : "absent"}`
    };
  }

  async bulkSelectRows(count: number): Promise<number> {
    const checkboxes = this.table.locator("input[type='checkbox']");
    const total = await checkboxes.count();
    const toSelect = Math.min(count, total);
    for (let i = 0; i < toSelect; i++) {
      await checkboxes.nth(i).check();
    }
    return toSelect;
  }

  async switchToArchiveTab(): Promise<void> {
    const archiveTab = this.page.getByText("Archive", { exact: true }).first();
    if (await archiveTab.count() > 0) await archiveTab.click();
    await this.page.waitForTimeout(500);
  }

  async switchToInboxTab(): Promise<void> {
    const inboxTab = this.page.getByText("Inbox", { exact: true }).first();
    if (await inboxTab.count() > 0) await inboxTab.click();
    await this.page.waitForTimeout(500);
  }

  async validationMessages(): Promise<string[]> {
    const dialog = this.page.getByRole("dialog");
    if (await dialog.count() === 0 || !await dialog.isVisible().catch(() => false)) return [];
    const explicitMessages = (await dialog.locator("[role='alert'], .text-red-500, .text-destructive, p").allTextContents())
      .map((text) => text.replace(/\s+/g, " ").trim())
      .filter((text) => text.length > 0 && text.length < 140 && /required|invalid|enter|must|valid/i.test(text));
    return [...new Set(explicitMessages)].slice(0, 12);
  }

  async screenshot(screenshotPath: string): Promise<void> {
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
  }

  private async fillCloseDateIfPresent(dialog: Locator): Promise<void> {
    const closeDate = dialog.getByPlaceholder("DD/MM/YYYY").first();
    if (await closeDate.count() === 0) return;
    await closeDate.fill(formatDateForCrm(daysFromToday(7)));
    await dialog.getByRole("heading", { name: "Add Lead", exact: true }).click({ force: true });
  }

  private async selectFirstProductIfPresent(dialog: Locator): Promise<void> {
    const product = dialog.getByPlaceholder("Select Product", { exact: true }).first();
    if (await product.count() === 0 || !await product.isVisible().catch(() => false)) return;
    for (const name of ["pen", "cloth"]) {
      await product.fill(name);
      const option = this.page.getByText(name, { exact: true }).last();
      if (await option.count() > 0 && await option.isVisible().catch(() => false)) {
        await option.click();
        await dialog.getByRole("heading", { name: "Add Lead", exact: true }).click({ force: true });
        return;
      }
    }
    await product.fill("");
  }
}

function daysFromToday(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function formatDateForCrm(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}
