import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/cli/index.ts",
        "src/cli/config-check.ts",
        "src/cli/mission.ts",
        "src/cli/leads.ts",
        "src/browser/login-page.ts",
        "src/browser/environment-observer.ts",
        "src/browser/evidence-recorder.ts",
        "src/leads/run.ts",
        "src/reporting/leads-workbook.ts",
        "src/pages/leads-page.ts"
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75
      }
    }
  }
});
