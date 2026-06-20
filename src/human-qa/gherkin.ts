import type { MissionStep } from "./types.js";

const phasePattern = /^(Given|When|Then|And)\s+(.+)$/i;

export function parseGherkinSteps(source: string): MissionStep[] {
  let previousPhase: MissionStep["phase"] | undefined;
  const steps: MissionStep[] = [];

  for (const line of source.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
    if (/^(Feature|Scenario):/i.test(line)) continue;
    const match = line.match(phasePattern);
    if (!match) continue;
    const keyword = match[1]?.toLowerCase();
    const instruction = match[2]?.trim() ?? "";
    const phase = keyword === "and"
      ? previousPhase
      : keyword as MissionStep["phase"];
    if (!phase) throw new Error("Gherkin 'And' cannot appear before Given, When, or Then.");
    previousPhase = phase;
    steps.push({
      id: `STEP-${String(steps.length + 1).padStart(3, "0")}`,
      phase,
      instruction
    });
  }
  if (steps.length === 0) throw new Error("No Given/When/Then steps were found.");
  return steps;
}
