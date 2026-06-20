import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, test } from "vitest";
import { workbookSheetOrder } from "../../src/reporting/contracts.js";
import { writeWorkbook } from "../../src/reporting/workbook.js";

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
});
