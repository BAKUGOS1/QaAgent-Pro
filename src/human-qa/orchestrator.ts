import { qaMissionSchema } from "./mission-schema.js";
import { planMission } from "./mission-planner.js";
import { assessRisks } from "./risk-analyst.js";

export function prepareMission(input: unknown) {
  const mission = qaMissionSchema.parse(input);
  const risks = assessRisks(mission.risks);
  const intents = planMission(mission, risks);
  return { mission, risks, intents };
}
