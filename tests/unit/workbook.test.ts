import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, test } from "vitest";
import { workbookSheetOrder } from "../../src/reporting/contracts.js";
import { writeLeadsWorkbook } from "../../src/reporting/leads-workbook.js";
import { writeWorkbook } from "../../src/reporting/workbook.js";
import type { LeadsRunReport } from "../../src/leads/types.js";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4mUAAAAASUVORK5CYII=",
  "base64"
);

describe("Excel workbook contract", () => {
  test("writes the exact sheet order and embeds a screenshot", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qap-workbook-"));
    const screenshotPath = path.join(directory, "evidence.png");
    const outputPath = path.join(directory, "report.xlsx");
    fs.writeFileSync(screenshotPath, onePixelPng);

    await writeWorkbook(outputPath, [{
      findingId: "QAP-BUG-001",
      module: "Framework",
      scenarioId: "UNIT-001",
      sourceClassification: "observed-application",
      category: "Functional Bug",
      severity: "High",
      steps: "Generate workbook.",
      expectedResult: "Workbook opens.",
      actualResult: "Workbook opens.",
      uiEvidence: "fixture",
      networkEvidence: "not applicable",
      persistenceResult: "not applicable",
      traceReference: "",
      productConfirmationStatus: ""
    }], screenshotPath);

    expect(fs.statSync(outputPath).size).toBeGreaterThan(1_000);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputPath);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([...workbookSheetOrder]);
    expect(workbook.getWorksheet("Bug Report")?.getImages()).toHaveLength(1);
    expect(workbook.getWorksheet("Bug Report")?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(workbook.getWorksheet("Test Execution")?.getRow(1).values).toContain("Reconciliation Status");
  });

  test("writes Leads dependency, network, validation, and trace evidence", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qap-leads-workbook-"));
    const screenshotPath = path.join(directory, "lead.png");
    const outputPath = path.join(directory, "leads.xlsx");
    const tracePath = path.join(directory, "trace.zip");
    fs.writeFileSync(screenshotPath, onePixelPng);
    fs.writeFileSync(tracePath, "trace");
    const report: LeadsRunReport = {
      runId: "RUN-LEADS",
      startedAt: "2026-06-22T00:00:00.000Z",
      endedAt: "2026-06-22T00:01:00.000Z",
      environmentAccess: "mutation-allowed",
      cleanup: [],
      reportPath: outputPath,
      release: {
        decision: "no-go",
        confidence: 0.8,
        reasons: ["fixture blocked"],
        residualRisks: ["LEAD-013 dependency"]
      },
      scenarios: [{
        id: "LEAD-013",
        title: "Edit label",
        status: "Blocked",
        category: "Dependency Blocker",
        severity: "Medium",
        steps: "Edit label",
        expected: "Runs after fixture creation.",
        actual: "Depends on LEAD-006.",
        riskScore: 8,
        releaseImpact: "Dependent coverage deferred.",
        dependency: { scenarioId: "LEAD-006", reason: "Create fixture blocked." },
        oracles: [{ oracle: "ui", status: "not-observed", detail: "Dependency blocked." }],
        verification: {
          scenarioId: "LEAD-013",
          attribution: "automation-defect",
          confidence: 0.9,
          verified: false,
          reasons: ["Dependency blocked."],
          missingOracles: ["ui"]
        },
        evidence: {
          startedAt: "2026-06-22T00:00:00.000Z",
          endedAt: "2026-06-22T00:00:01.000Z",
          durationMs: 1_000,
          browser: { consoleErrors: [], pageErrors: [], network: [] },
          tracePath,
          screenshotPath,
          validationMessages: ["Business Name is required"],
          matchedNetwork: [{
            actionName: "leads.create",
            matchedAction: "leads.create",
            matched: false,
            method: "POST",
            url: "/api/v1/leads",
            durationMs: 4_000,
            error: "No leads.create network request matched."
          }]
        }
      }]
    };

    await writeLeadsWorkbook(report);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputPath);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([...workbookSheetOrder]);
    expect(workbook.getWorksheet("Test Execution")?.getRow(1).values).toEqual(expect.arrayContaining([
      "Dependency", "Action Network", "Validation Messages", "Trace"
    ]));
    expect(workbook.getWorksheet("Evidence Log")?.getRow(1).values).toEqual(expect.arrayContaining([
      "Matched Action Network", "Validation Messages", "Trace"
    ]));
  });
});
