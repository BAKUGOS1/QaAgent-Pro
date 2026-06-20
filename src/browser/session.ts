import fs from "node:fs";
import path from "node:path";

export const authStatePath = path.join(process.cwd(), ".auth", "crm.json");
export const environmentObservationPath = path.join(process.cwd(), ".auth", "environment-observation.json");

export function ensureBrowserDirectories(): void {
  for (const directory of [
    path.dirname(authStatePath),
    path.join(process.cwd(), "artifacts", "screenshots"),
    path.join(process.cwd(), "artifacts", "traces"),
    path.join(process.cwd(), "artifacts", "logs"),
    path.join(process.cwd(), "artifacts", "state")
  ]) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export function hasStoredAuth(): boolean {
  return fs.existsSync(authStatePath) && fs.statSync(authStatePath).size > 0;
}
