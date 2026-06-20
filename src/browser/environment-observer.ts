import fs from "node:fs";
import type { Page } from "@playwright/test";
import type { AppConfig } from "../config/schema.js";
import { environmentObservationPath } from "./session.js";

export interface BrowserEnvironmentObservation {
  url: string;
  hostname: string;
  visibleMarkers: string[];
  observedAt: string;
}

export async function observeEnvironment(
  page: Page,
  config: AppConfig
): Promise<BrowserEnvironmentObservation> {
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  const visibleMarkers = [
    config.CRM_TENANT,
    ...config.STAGING_MARKER_PATTERNS
  ].filter((candidate) => candidate.length > 0 && bodyText.includes(candidate.toLowerCase()));
  const currentUrl = new URL(page.url());
  return {
    url: `${currentUrl.origin}${currentUrl.pathname}`,
    hostname: currentUrl.hostname,
    visibleMarkers: [...new Set(visibleMarkers)],
    observedAt: new Date().toISOString()
  };
}

export function writeEnvironmentObservation(observation: BrowserEnvironmentObservation): void {
  fs.writeFileSync(environmentObservationPath, `${JSON.stringify(observation, null, 2)}\n`, {
    mode: 0o600
  });
}
