import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { appConfigSchema, type AppConfig } from "./schema.js";

export function loadEnvironmentFiles(cwd = process.cwd()): void {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(cwd, fileName);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false, quiet: true });
    }
  }
}

export function parseConfig(environment: NodeJS.ProcessEnv | Record<string, string | undefined>): AppConfig {
  return appConfigSchema.parse(environment);
}

export function loadConfig(cwd = process.cwd()): AppConfig {
  loadEnvironmentFiles(cwd);
  return parseConfig(process.env);
}

export function configSummary(config: AppConfig): Record<string, unknown> {
  return {
    baseUrlConfigured: config.CRM_BASE_URL.length > 0,
    emailConfigured: config.CRM_EMAIL.length > 0,
    passwordConfigured: config.CRM_PASSWORD.length > 0,
    environment: config.CRM_ENVIRONMENT || "unset",
    tenant: config.CRM_TENANT || "unset",
    stagingHostAllowlistCount: config.STAGING_HOST_ALLOWLIST.length,
    stagingTenantAllowlistCount: config.STAGING_TENANT_ALLOWLIST.length,
    qaAccountAllowlistCount: config.QA_ACCOUNT_ALLOWLIST.length,
    reportFormat: config.REPORT_FORMAT,
    headless: config.HEADLESS
  };
}
