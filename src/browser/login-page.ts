import { expect, type Page } from "@playwright/test";
import type { AppConfig } from "../config/schema.js";

export class LoginPage {
  constructor(
    private readonly page: Page,
    private readonly config: AppConfig
  ) {}

  async login(): Promise<void> {
    if (!this.config.CRM_BASE_URL || !this.config.CRM_EMAIL || !this.config.CRM_PASSWORD) {
      throw new Error("CRM_BASE_URL, CRM_EMAIL, and CRM_PASSWORD are required for authentication.");
    }
    const loginUrl = new URL(this.config.CRM_LOGIN_PATH, this.config.CRM_BASE_URL).toString();
    await this.page.goto(loginUrl);
    await this.page.getByLabel("Email ID", { exact: true }).fill(this.config.CRM_EMAIL);
    await this.page.getByLabel("Password", { exact: true }).fill(this.config.CRM_PASSWORD);
    await this.page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(this.page).toHaveURL((url) => url.pathname === this.config.CRM_AUTH_SUCCESS_PATH);
  }
}
