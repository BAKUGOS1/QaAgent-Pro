import { runLeadsMvp } from "../leads/run.js";
import { redactText } from "../shared/redaction.js";

try {
  const headed = process.argv.includes("--headed");
  const refreshOnly = process.argv.includes("--refresh-only");
  const report = await runLeadsMvp({ headed, refreshOnly });
  process.stdout.write(`${JSON.stringify({
    runId: report.runId,
    reportPath: report.reportPath,
    release: report.release,
    counts: {
      pass: report.scenarios.filter((item) => item.status === "Pass").length,
      fail: report.scenarios.filter((item) => item.status === "Fail").length,
      blocked: report.scenarios.filter((item) => item.status === "Blocked").length,
      confirmation: report.scenarios.filter((item) => item.status === "Needs Product Confirmation").length
    }
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${redactText(error instanceof Error ? error.message : String(error))}\n`);
  process.exitCode = 1;
}
