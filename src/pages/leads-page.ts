import { expect, type Locator, type Page } from "@playwright/test";
import type { LeadFixture, ObservedControl } from "../leads/types.js";

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
    const cells = await this.table.getByRole("row").nth(1).getByRole("cell").allTextContents();
    return {
      company: cells[1]?.trim() ?? "",
      name: cells[2]?.trim() ?? "",
      mobile: cells[3]?.trim() ?? "",
      email: cells[4]?.trim() ?? ""
    };
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
    const tagInput = dialog.locator("input[cmdk-input]");
    await tagInput.click();
    await this.page.locator("[cmdk-item]").filter({ hasText: "HOT" }).first().click();
    await dialog.getByRole("heading", { name: "Add Lead", exact: true }).click({ force: true });
    await dialog.getByPlaceholder("Select Source Channel Type", { exact: true }).click();
    await this.page.getByText("Website", { exact: true }).last().click();
    const owner = dialog.getByRole("combobox").filter({ hasText: "Select owner" });
    await owner.click();
    await this.page.getByRole("option").first().click();
    await dialog.getByRole("heading", { name: "Add Lead", exact: true }).click({ force: true });
  }

  async saveLead(): Promise<void> {
    await this.page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
    await expect(this.page.getByRole("dialog")).toBeHidden();
  }

  async search(value: string): Promise<void> {
    await this.searchButton.click();
    const search = this.page.locator('input[type="search"], input[placeholder*="Search" i]').first();
    await search.fill(value);
    await expect(this.table).toContainText(value, { ignoreCase: true });
  }

  async clearSearch(): Promise<void> {
    const search = this.page.locator('input[type="search"], input[placeholder*="Search" i]').first();
    if (await search.count()) await search.fill("");
  }

  async hasText(value: string): Promise<boolean> {
    return (await this.table.getByText(value, { exact: false }).count()) > 0;
  }

  async screenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, fullPage: true });
  }
}
