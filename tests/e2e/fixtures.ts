import { test as base } from "@playwright/test";
import { loadConfig } from "../../src/config/load.js";
import type { AppConfig } from "../../src/config/schema.js";
import { EvidenceRecorder } from "../../src/browser/evidence-recorder.js";

interface QaFixtures {
  appConfig: AppConfig;
  evidenceRecorder: EvidenceRecorder;
}

export const test = base.extend<QaFixtures>({
  appConfig: async (_fixtures, use) => {
    await use(loadConfig());
  },
  evidenceRecorder: async ({ page, appConfig }, use) => {
    const recorder = new EvidenceRecorder([appConfig.CRM_PASSWORD]);
    recorder.attach(page);
    await use(recorder);
  }
});

export { expect } from "@playwright/test";
