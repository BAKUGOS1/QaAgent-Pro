import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { workbookSheetOrder } from "./contracts.js";
import type { LeadsRunReport, ScenarioExecutionResult } from "../leads/types.js";

function styleHeader(sheet: ExcelJS.Worksheet): void {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F2683" } };
  row.alignment = { wrapText: true, vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function findingRows(scenarios: ScenarioExecutionResult[], categories: string[]): ScenarioExecutionResult[] {
  return scenarios.filter((scenario) => scenario.status !== "Pass" && categories.includes(scenario.category));
}

export async function writeLeadsWorkbook(report: LeadsRunReport): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QaAgent-Pro";
  workbook.created = new Date();
  const sheets = Object.fromEntries(workbookSheetOrder.map((name) => [name, workbook.addWorksheet(name)]));

  const findingHeaders = [
    "Finding ID", "Module", "Scenario ID", "Issue", "Category", "Priority", "Status",
    "Steps", "Expected Result", "Actual Result", "Verification Attribution",
    "Verification Confidence", "Risk Score", "Release Impact", "Screenshot"
  ];

  const writeFindings = (sheetName: string, rows: ScenarioExecutionResult[]) => {
    const sheet = sheets[sheetName];
    if (!sheet) return;
    sheet.addRow(findingHeaders);
    rows.forEach((scenario, index) => {
      sheet.addRow([
        `QAP-${scenario.id}`, "Leads", scenario.id, scenario.title, scenario.category,
        scenario.severity, scenario.status, scenario.steps, scenario.expected, scenario.actual,
        scenario.verification.attribution, scenario.verification.confidence, scenario.riskScore,
        scenario.releaseImpact, scenario.evidence.screenshotPath ? "Embedded" : ""
      ]);
      if (scenario.evidence.screenshotPath && fs.existsSync(scenario.evidence.screenshotPath)) {
        const imageId = workbook.addImage({
          filename: scenario.evidence.screenshotPath,
          extension: "png"
        });
        sheet.addImage(imageId, {
          tl: { col: 14, row: index + 1 },
          ext: { width: 320, height: 180 }
        });
        sheet.getRow(index + 2).height = 140;
      }
    });
    styleHeader(sheet);
  };

  writeFindings("Bug Report", findingRows(report.scenarios, ["Functional Bug", "Data Integrity Issue", "Performance Issue", "Accessibility Issue"]));
  writeFindings("UX Issues", findingRows(report.scenarios, ["UX Issue"]));
  writeFindings("Feature Gaps", findingRows(report.scenarios, ["Feature Gap", "Needs Product Confirmation"]));
  writeFindings("Refresh Persistence", report.scenarios.filter((scenario) =>
    ["LEAD-006", "LEAD-013", "LEAD-014", "LEAD-015", "LEAD-016", "LEAD-017", "LEAD-018", "LEAD-019", "LEAD-023", "LEAD-024", "LEAD-026", "LEAD-054", "LEAD-055"].includes(scenario.id)
  ));

  const summary = sheets["Summary"];
  summary?.addRows([
    ["Metric", "Value"],
    ["Run ID", report.runId],
    ["Environment Access", report.environmentAccess],
    ["Release Decision", report.release.decision],
    ["Release Confidence", report.release.confidence],
    ["Passed", report.scenarios.filter((item) => item.status === "Pass").length],
    ["Failed", report.scenarios.filter((item) => item.status === "Fail").length],
    ["Blocked", report.scenarios.filter((item) => item.status === "Blocked").length],
    ["Needs Product Confirmation", report.scenarios.filter((item) => item.status === "Needs Product Confirmation").length],
    ["Not Applicable", report.scenarios.filter((item) => item.status === "Not Applicable").length],
    ["Cleanup Failures", report.cleanup.filter((item) => item.status === "Cleanup Failed").length]
  ]);
  if (summary) styleHeader(summary);

  const backlog = sheets["Next Build Backlog"];
  backlog?.addRow(["Backlog ID", "Type", "Recommendation", "Reason", "Affected Module", "Priority", "Acceptance Criteria", "Linked Evidence"]);
  report.scenarios.filter((item) => item.status !== "Pass" && item.status !== "Not Applicable").forEach((item, index) => {
    backlog?.addRow([
      `QAP-NB-${String(index + 1).padStart(3, "0")}`, item.category,
      `Resolve ${item.title.toLowerCase()}`, item.actual, "Leads",
      item.severity === "Critical" ? "P0" : item.severity === "High" ? "P1" : "P2",
      item.expected, item.evidence.screenshotPath ?? item.id
    ]);
  });
  if (backlog) styleHeader(backlog);

  const execution = sheets["Test Execution"];
  execution?.addRow([
    "Scenario ID", "Title", "Status", "Risk Score", "Duration (ms)", "UI Oracle",
    "Network Oracle", "Persistence Oracle", "Attribution", "Confidence", "Cleanup/Reconciliation"
  ]);
  report.scenarios.forEach((item) => execution?.addRow([
    item.id, item.title, item.status, item.riskScore, item.evidence.durationMs,
    item.oracles.find((oracle) => oracle.oracle === "ui")?.status ?? "not-observed",
    item.oracles.find((oracle) => oracle.oracle === "network")?.status ?? "not-observed",
    item.oracles.find((oracle) => oracle.oracle === "persistence")?.status ?? "not-observed",
    item.verification.attribution, item.verification.confidence,
    report.cleanup.find((cleanup) => cleanup.entity.uiIdentifier && item.actual.includes(cleanup.entity.uiIdentifier))?.status ?? ""
  ]));
  report.cleanup.forEach((cleanup) => execution?.addRow([
    "CLEANUP", cleanup.entity.uiIdentifier, cleanup.status, "", "", "", "", "",
    "", "", cleanup.detail
  ]));
  if (execution) styleHeader(execution);

  const evidence = sheets["Evidence Log"];
  evidence?.addRow(["Scenario ID", "Started", "Ended", "Screenshot", "Console Errors", "Page Errors", "Network Evidence", "Trace"]);
  report.scenarios.forEach((item) => evidence?.addRow([
    item.id, item.evidence.startedAt, item.evidence.endedAt, item.evidence.screenshotPath ?? "",
    item.evidence.browser.consoleErrors.join(" | "), item.evidence.browser.pageErrors.join(" | "),
    item.evidence.browser.network.map((entry) => `${entry.method} ${entry.status ?? entry.failure} ${entry.url}`).join(" | "),
    ""
  ]));
  if (evidence) styleHeader(evidence);

  const metadata = sheets["Run Metadata"];
  metadata?.addRows([
    ["Key", "Value"],
    ["Run ID", report.runId],
    ["Started At", report.startedAt],
    ["Ended At", report.endedAt],
    ["Environment Access", report.environmentAccess],
    ["Scenario Count", report.scenarios.length],
    ["Report Format", "xlsx"],
    ["Agent Mode", "deterministic-local"],
    ["Delete Enabled", "false"],
    ["Real Messages Enabled", "false"]
  ]);
  if (metadata) styleHeader(metadata);

  for (const sheet of workbook.worksheets) {
    sheet.columns.forEach((column) => { column.width = Math.min(45, Math.max(14, column.width ?? 14)); });
    sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
    if (sheet.columnCount > 0) sheet.autoFilter = { from: "A1", to: `${columnLetter(sheet.columnCount)}1` };
  }
  fs.mkdirSync(path.dirname(report.reportPath), { recursive: true });
  await workbook.xlsx.writeFile(report.reportPath);
}

function columnLetter(column: number): string {
  let current = column;
  let result = "";
  while (current > 0) {
    result = String.fromCharCode(65 + ((current - 1) % 26)) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}
