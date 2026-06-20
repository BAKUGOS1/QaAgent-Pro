import type { LeadFixture } from "../leads/types.js";

export function createLeadFixture(prefix: string, runId: string, suffix = "PRIMARY"): LeadFixture {
  const digits = Date.now().toString().slice(-8);
  const safeRun = runId.replace(/[^A-Z0-9]/gi, "").slice(-10);
  return {
    name: `${prefix}${safeRun}_${suffix}`,
    company: `${prefix}${safeRun}_${suffix}_CO`,
    mobile: `9${digits.slice(-9).padStart(9, "0")}`,
    email: `qa.${safeRun.toLowerCase()}.${suffix.toLowerCase()}@example.com`,
    value: "12500"
  };
}
