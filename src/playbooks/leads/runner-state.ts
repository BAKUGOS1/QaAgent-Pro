import type { BrowserContext, Page } from "playwright";
import type { EvidenceRecorder } from "../../browser/evidence-recorder.js";
import type { EntityRegistry } from "../../leads/entity-registry.js";
import type { LeadFixture, ScenarioExecutionResult } from "../../leads/types.js";
import type { LeadsPage } from "../../pages/leads-page.js";
import type { Logger } from "../../shared/logger.js";

export interface RunnerState {
  page: Page;
  context: BrowserContext;
  leads: LeadsPage;
  recorder: EvidenceRecorder;
  runId: string;
  fixture: LeadFixture;
  baseline: LeadFixture;
  registry: EntityRegistry;
  access: "read-only" | "mutation-allowed";
  screenshotDir: string;
  tracePath: string;
  baseUrl: string;
  secrets: string[];
  logger: Logger;
  fixtureCreateFailure?: ScenarioExecutionResult;
}
