import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    browserName: "chromium",
    headless: process.env.HEADLESS !== "false",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "auth",
      testMatch: /auth\.setup\.ts/
    },
    {
      name: "chromium",
      testIgnore: /auth\.setup\.ts/,
      use: {
        storageState: ".auth/crm.json"
      }
    }
  ]
});
