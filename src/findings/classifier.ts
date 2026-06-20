import type { ClassifiedFinding, FindingInput } from "./types.js";

export function classifyFinding(input: FindingInput): ClassifiedFinding {
  if (input.confirmation) {
    return { source: "needs-product-confirmation", category: "Needs Product Confirmation" };
  }
  if (input.persistenceFailure) {
    return {
      source: input.observed ? "observed-application" : "confirmed-blueprint",
      category: "Data Integrity Issue"
    };
  }
  if (input.functionalFailure) {
    return {
      source: input.observed ? "observed-application" : "confirmed-blueprint",
      category: "Functional Bug"
    };
  }
  if (input.performanceFailure) {
    return { source: "observed-application", category: "Performance Issue" };
  }
  if (input.accessibilityFailure) {
    return { source: "observed-application", category: "Accessibility Issue" };
  }
  if (input.uxConcern) {
    return { source: "observed-application", category: "UX Issue" };
  }
  if (input.blueprint && input.observed === undefined) {
    return { source: "confirmed-blueprint", category: "Feature Gap" };
  }
  return { source: "observed-application", category: "UX Issue" };
}
