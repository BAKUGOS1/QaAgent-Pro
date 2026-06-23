import { test as setup } from "@playwright/test";
import { loadConfig } from "../../src/config/load.js";
import { EvidenceRecorder } from "../../src/browser/evidence-recorder.js";
import { observeEnvironment, writeEnvironmentObservation } from "../../src/browser/environment-observer.js";
import { LoginPage } from "../../src/browser/login-page.js";
import { authStatePath, ensureBrowserDirectories } from "../../src/browser/session.js";

setup("authenticate dedicated QA account", async ({ page }) => {
  const config = loadConfig();
  setup.skip(
    !config.CRM_BASE_URL || !config.CRM_EMAIL || !config.CRM_PASSWORD,
    "Local CRM environment credentials are not configured."
  );
  ensureBrowserDirectories();
  const recorder = new EvidenceRecorder([config.CRM_PASSWORD]);
  recorder.attach(page);
  await setup.step("Log in using environment-backed credentials", async () => {
    await new LoginPage(page, config).login();
  });
  await setup.step("Capture authentication state and environment markers", async () => {
    await page.goto(new URL("/inbox", config.CRM_BASE_URL).toString());
    await page.getByText(config.CRM_TENANT, { exact: true }).waitFor({ timeout: 20_000 }).catch(() => {});
    const observation = await observeEnvironment(page, config);
    writeEnvironmentObservation(observation);
    await page.context().storageState({ path: authStatePath });
  });
});
