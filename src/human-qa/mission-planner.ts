import type { HeuristicName, QaMission, RiskAssessment, TestIntent } from "./types.js";

const heuristicPurpose: Record<HeuristicName, string> = {
  boundaries: "Probe values at, below, and above meaningful limits.",
  interruptions: "Probe cancel, back, reload, retry, and interrupted state recovery.",
  "state-transitions": "Probe legal and illegal transitions and their persisted state.",
  "data-variations": "Probe valid, empty, invalid, long, duplicate, and special-character data.",
  "error-guessing": "Probe common validation, integration, stale-state, and timing failures.",
  checklist: "Apply the module quality checklist consistently.",
  consistency: "Compare labels, controls, outcomes, and repeated patterns for consistency.",
  persistence: "Recheck state after reload, navigation, search, and a fresh session.",
  accessibility: "Check names, labels, keyboard flow, focus, and semantic feedback.",
  performance: "Measure user-visible load and action duration against thresholds."
};

function priorityFromRisks(risks: RiskAssessment[]): TestIntent["priority"] {
  const highest = risks[0]?.level;
  return highest ?? "medium";
}

export function planMission(mission: QaMission, risks: RiskAssessment[]): TestIntent[] {
  const priority = priorityFromRisks(risks);
  const base: TestIntent = {
    id: `${mission.id}-BASE`,
    missionId: mission.id,
    title: mission.title,
    rationale: mission.charter,
    heuristic: "base-mission",
    requiredOracles: mission.oracles,
    priority,
    executable: mission.steps.every((step) => step.phase !== "when" || Boolean(step.actionRef)),
    actionRefs: mission.steps.flatMap((step) => step.actionRef ? [step.actionRef] : [])
  };

  return [
    base,
    ...mission.heuristics.map((heuristic, index): TestIntent => ({
      id: `${mission.id}-H${String(index + 1).padStart(2, "0")}`,
      missionId: mission.id,
      title: `${mission.module}: ${heuristic}`,
      rationale: heuristicPurpose[heuristic],
      heuristic,
      requiredOracles: mission.oracles,
      priority,
      executable: false,
      actionRefs: []
    }))
  ];
}
