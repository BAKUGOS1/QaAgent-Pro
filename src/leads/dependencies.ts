export const fixtureDependentScenarioIds = new Set([
  "LEAD-013", "LEAD-014", "LEAD-015", "LEAD-016", "LEAD-017", "LEAD-018", "LEAD-019",
  "LEAD-023", "LEAD-024", "LEAD-025", "LEAD-026", "LEAD-027", "LEAD-050", "LEAD-055", "LEAD-056"
]);

export function dependsOnCreatedLeadFixture(scenarioId: string): boolean {
  return fixtureDependentScenarioIds.has(scenarioId);
}
