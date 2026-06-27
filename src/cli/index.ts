#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { Command } from "commander";
import { ZodError } from "zod";
import { loadConfig, configSummary } from "../config/load.js";
import { redactText } from "../shared/redaction.js";

// ── Package root resolution ──────────────────────────────────────────
// When installed as a package, this file lives at:
//   node_modules/qaagent-pro/dist/src/cli/index.js
// so pkgRoot = ../../.. relative to this file → package root.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, "..", "..", "..");

const program = new Command();

program
  .name("qaagent-pro")
  .description("Deterministic, human-style QA automation for CRM applications")
  .version("0.1.0");

// ── init ─────────────────────────────────────────────────────────────
program
  .command("init")
  .description("Scaffold configuration files in the current directory")
  .action(() => {
    const cwd = process.cwd();
    const envTarget = path.join(cwd, ".env");
    const envSource = path.join(pkgRoot, ".env.example");

    // Copy .env.example → .env
    if (fs.existsSync(envTarget)) {
      process.stdout.write("✓ .env already exists, skipping.\n");
    } else if (fs.existsSync(envSource)) {
      fs.copyFileSync(envSource, envTarget);
      process.stdout.write("✓ Created .env from template.\n");
    } else {
      process.stderr.write("⚠ .env.example not found in the package. Create .env manually.\n");
    }

    // Create directories
    for (const dir of [".auth", "artifacts/reports", "artifacts/screenshots", "artifacts/traces", "artifacts/logs", "artifacts/state", "config/blueprint"]) {
      const dirPath = path.join(cwd, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        process.stdout.write(`✓ Created ${dir}/\n`);
      }
    }

    // Copy sample mission if config/blueprint is empty
    const sampleSource = path.join(pkgRoot, "config", "blueprint", "sample-mission.json");
    const sampleTarget = path.join(cwd, "config", "blueprint", "sample-mission.json");
    if (fs.existsSync(sampleSource) && !fs.existsSync(sampleTarget)) {
      fs.copyFileSync(sampleSource, sampleTarget);
      process.stdout.write("✓ Copied sample-mission.json to config/blueprint/.\n");
    }

    process.stdout.write("\n🚀 Next steps:\n");
    process.stdout.write("   1. Fill in your CRM staging credentials in .env\n");
    process.stdout.write("   2. Run: qaagent-pro check\n");
    process.stdout.write("   3. Run: npx playwright install chromium\n");
    process.stdout.write("   4. Run: qaagent-pro auth\n");
    process.stdout.write("   5. Run: qaagent-pro run leads\n\n");
  });

// ── check ────────────────────────────────────────────────────────────
program
  .command("check")
  .description("Validate environment configuration against the schema")
  .action(() => {
    try {
      const config = loadConfig();
      process.stdout.write(`${JSON.stringify(configSummary(config), null, 2)}\n`);
      process.stdout.write("✓ Configuration schema is valid. Missing mutation gates will force read-only mode.\n");
    } catch (error) {
      const message = error instanceof ZodError
        ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
        : error instanceof Error ? error.message : String(error);
      process.stderr.write(`✗ ${redactText(message)}\n`);
      process.exitCode = 1;
    }
  });

// ── auth ─────────────────────────────────────────────────────────────
program
  .command("auth")
  .description("Login to the CRM and save browser authentication state")
  .action(() => {
    const playwrightConfig = path.join(pkgRoot, "playwright.config.ts");
    if (!fs.existsSync(playwrightConfig)) {
      process.stderr.write("✗ playwright.config.ts not found. Is the package installed correctly?\n");
      process.exitCode = 1;
      return;
    }
    process.stdout.write("🔐 Starting Playwright auth setup...\n");
    try {
      execSync(`npx playwright test --config="${playwrightConfig}" --project=auth`, {
        cwd: process.cwd(),
        stdio: "inherit",
        env: { ...process.env, HEADLESS: process.env.HEADLESS ?? "false" }
      });
      process.stdout.write("✓ Authentication state saved to .auth/crm.json\n");
    } catch {
      process.stderr.write("✗ Authentication failed. Check your .env credentials and try again.\n");
      process.exitCode = 1;
    }
  });

// ── run ──────────────────────────────────────────────────────────────
const runCmd = program
  .command("run")
  .description("Execute a QA test suite");

runCmd
  .command("leads")
  .description("Run all 56 Leads scenarios against the staging CRM")
  .option("--headed", "Run with a visible browser window", false)
  .option("--refresh-only", "Run only the refresh/persistence subset", false)
  .action(async (options: { headed: boolean; refreshOnly: boolean }) => {
    try {
      const { runLeadsMvp } = await import("../leads/run.js");
      const report = await runLeadsMvp({ headed: options.headed, refreshOnly: options.refreshOnly });
      const counts = {
        pass: report.scenarios.filter((s) => s.status === "Pass").length,
        fail: report.scenarios.filter((s) => s.status === "Fail").length,
        blocked: report.scenarios.filter((s) => s.status === "Blocked").length,
        confirmation: report.scenarios.filter((s) => s.status === "Needs Product Confirmation").length
      };
      process.stdout.write(`\n${JSON.stringify({
        runId: report.runId,
        reportPath: report.reportPath,
        release: report.release,
        counts
      }, null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`✗ ${redactText(error instanceof Error ? error.message : String(error))}\n`);
      process.exitCode = 1;
    }
  });

// ── mission ──────────────────────────────────────────────────────────
program
  .command("mission")
  .description("Validate and compile a deterministic Human-QA mission")
  .requiredOption("-f, --file <path>", "Path to a JSON mission file")
  .action(async (options: { file: string }) => {
    try {
      const { prepareMission } = await import("../human-qa/orchestrator.js");
      const input: unknown = JSON.parse(fs.readFileSync(options.file, "utf8"));
      const prepared = prepareMission(input);
      process.stdout.write(`${JSON.stringify(prepared, null, 2)}\n`);
    } catch (error) {
      const message = error instanceof ZodError
        ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
        : error instanceof Error ? error.message : String(error);
      process.stderr.write(`✗ ${redactText(message)}\n`);
      process.exitCode = 1;
    }
  });

program.parse();
