export type RequirementSource =
  | "confirmed-blueprint"
  | "observed-application"
  | "needs-product-confirmation";

export interface ConfirmedBlueprintRequirement {
  source: "confirmed-blueprint";
  id: string;
  module: string;
  requirement: string;
  sourceReference: string;
  confidence: "high";
}

export interface ObservedApplicationBehavior {
  source: "observed-application";
  id: string;
  module: string;
  behavior: string;
  evidenceReference: string;
}

export interface ProductConfirmationItem {
  source: "needs-product-confirmation";
  id: string;
  module: string;
  question: string;
  reason: string;
}

export type RequirementRecord =
  | ConfirmedBlueprintRequirement
  | ObservedApplicationBehavior
  | ProductConfirmationItem;

export type FindingCategory =
  | "Functional Bug"
  | "UX Issue"
  | "Feature Gap"
  | "Data Integrity Issue"
  | "Performance Issue"
  | "Accessibility Issue"
  | "Needs Product Confirmation";

export interface FindingInput {
  module: string;
  scenarioId: string;
  blueprint?: ConfirmedBlueprintRequirement;
  observed?: ObservedApplicationBehavior;
  confirmation?: ProductConfirmationItem;
  functionalFailure?: boolean;
  persistenceFailure?: boolean;
  performanceFailure?: boolean;
  accessibilityFailure?: boolean;
  uxConcern?: boolean;
}

export interface ClassifiedFinding {
  source: RequirementSource;
  category: FindingCategory;
}
