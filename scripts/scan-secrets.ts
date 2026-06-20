import fs from "node:fs";
import path from "node:path";

const ignoredDirectories = new Set([".git", "node_modules", "coverage", "artifacts", ".auth", "tests"]);
const ignoredFiles = new Set(["crm.excalidraw", "QaAgent-Pro_PRD_TDD_Refresh_v2.pdf", "package-lock.json"]);
const textExtensions = new Set([".ts", ".js", ".json", ".md", ".yaml", ".yml", ".example"]);
const secretAssignment = /\b(?:CRM_PASSWORD|GROQ_API_KEY|OPENAI_API_KEY|API_KEY|ACCESS_TOKEN|REFRESH_TOKEN)\s*[:=]\s*["']([^"']+)["']/i;
const privateKeyMarker = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

export function scanSecrets(root = process.cwd()): string[] {
  const findings: string[] = [];
  for (const filePath of walk(root)) {
    if (ignoredFiles.has(path.basename(filePath))) continue;
    const extension = path.extname(filePath);
    if (!textExtensions.has(extension) && path.basename(filePath) !== ".env.example") continue;
    const content = fs.readFileSync(filePath, "utf8");
    if (privateKeyMarker.test(content)) findings.push(`${path.relative(root, filePath)}: private key marker`);
    for (const [index, line] of content.split(/\r?\n/).entries()) {
      const match = line.match(secretAssignment);
      if (match?.[1] && !["", "[REDACTED]", "your_key_here"].includes(match[1])) {
        findings.push(`${path.relative(root, filePath)}:${index + 1}: possible hardcoded secret`);
      }
    }
  }
  return findings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const findings = scanSecrets();
  if (findings.length > 0) {
    process.stderr.write(`${findings.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("Secret scan passed.\n");
  }
}
