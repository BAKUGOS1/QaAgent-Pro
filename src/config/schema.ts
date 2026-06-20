import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const csvList = z
  .string()
  .default("")
  .transform((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean));

const markerList = z
  .string()
  .default("staging,test,testing,qa")
  .transform((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean));

const optionalUrl = z
  .string()
  .default("")
  .refine((value) => value === "" || URL.canParse(value), "CRM_BASE_URL must be a valid URL when provided.");

export const appConfigSchema = z.object({
  CRM_BASE_URL: optionalUrl,
  CRM_EMAIL: z.string().default(""),
  CRM_PASSWORD: z.string().default(""),
  CRM_LOGIN_PATH: z.string().default("/login?from=%2Fhome"),
  CRM_AUTH_SUCCESS_PATH: z.string().default("/home"),
  CRM_ENVIRONMENT: z.string().default(""),
  CRM_TENANT: z.string().default(""),
  STAGING_HOST_ALLOWLIST: csvList,
  STAGING_TENANT_ALLOWLIST: csvList,
  QA_ACCOUNT_ALLOWLIST: csvList,
  STAGING_MARKER_PATTERNS: markerList,
  REQUIRE_VISIBLE_STAGING_MARKER: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  QA_AGENT_PREFIX: z.string().min(3).default("QA_AGENT_"),
  ALLOW_ARCHIVE: booleanFromString,
  ALLOW_DELETE: booleanFromString,
  ALLOW_DESTRUCTIVE: booleanFromString,
  ALLOW_REAL_MESSAGES: booleanFromString,
  ALLOW_SENSITIVE_EXPORT: booleanFromString,
  REPORT_FORMAT: z.literal("xlsx").default("xlsx"),
  HEADLESS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true")
});

export type AppConfig = z.output<typeof appConfigSchema>;
