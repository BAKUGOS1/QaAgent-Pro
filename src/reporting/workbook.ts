import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { workbookSheetOrder, type FindingReportRow } from "./contracts.js";

const findingHeaders: Array<keyof FindingReportRow> = [
  "findingId",
  "module",
  "scenarioId",
  "sourceClassification",
  "category",
  "severity",
  "steps",
  "expectedResult",
  "actualResult",
  "uiEvidence",
  "networkEvidence",
  "persistenceResult",
  "traceReference",
  "productConfirmationStatus",
  "verificationAttribution",
  "verificationConfidence",
  "riskScore",
  "releaseImpact"
];

export function createWorkbook(
  findings: FindingReportRow[] = [],
  screenshotPath?: string
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QaAgent-Pro";
  workbook.created = new Date(0);

  for (const name of workbookSheetOrder) {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1 }]
    });
    sheet.properties.defaultRowHeight = 22;
  }

  const bugSheet = workbook.getWorksheet("Bug Report");
  if (!bugSheet) throw new Error("Bug Report worksheet was not created.");
  bugSheet.addRow([...findingHeaders, "screenshot"]);
  bugSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  bugSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F2683" } };
  bugSheet.columns = findingHeaders.map((key) => ({
    key,
    width: key === "steps" || key.endsWith("Result") || key.endsWith("Evidence") ? 34 : 22
  }));
  bugSheet.getColumn(findingHeaders.length + 1).width = 22;

  for (const finding of findings) {
    bugSheet.addRow(findingHeaders.map((key) => finding[key] ?? ""));
  }

  if (screenshotPath) {
    if (!fs.existsSync(screenshotPath)) throw new Error(`Screenshot does not exist: ${screenshotPath}`);
    const extension = path.extname(screenshotPath).toLowerCase() === ".jpg" ? "jpeg" : "png";
    const imageId = workbook.addImage({ filename: screenshotPath, extension });
    bugSheet.addImage(imageId, {
      tl: { col: findingHeaders.length, row: 1 },
      ext: { width: 320, height: 180 }
    });
    bugSheet.getRow(2).height = 140;
  }

  const summary = workbook.getWorksheet("Summary");
  summary?.addRows([
    ["Metric", "Value"],
    ["Framework Phase", "1"],
    ["CRM execution", "Not implemented"]
  ]);

  const execution = workbook.getWorksheet("Test Execution");
  execution?.addRow([
    "Mission ID",
    "Role",
    "Scenario ID",
    "Heuristic",
    "Risk Score",
    "Required Oracles",
    "Verification Attribution",
    "Verification Confidence",
    "Run ID",
    "Entity Type",
    "Entity ID",
    "Final State",
    "Cleanup Action",
    "Retained Reason",
    "Reconciliation Status"
  ]);

  for (const sheet of workbook.worksheets) {
    sheet.eachRow((row) => {
      row.alignment = { vertical: "top", wrapText: true };
    });
    if (sheet.rowCount > 0) {
      sheet.autoFilter = { from: "A1", to: `${columnLetter(sheet.columnCount)}1` };
    }
  }
  return workbook;
}

export async function writeWorkbook(
  outputPath: string,
  findings: FindingReportRow[] = [],
  screenshotPath?: string
): Promise<void> {
  const workbook = createWorkbook(findings, screenshotPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await workbook.xlsx.writeFile(outputPath);
}

function columnLetter(column: number): string {
  let current = Math.max(column, 1);
  let result = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}
