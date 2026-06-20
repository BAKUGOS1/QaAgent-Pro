import type { BlueprintRequirement } from "../leads/types.js";

export const leadsBlueprintRequirements: BlueprintRequirement[] = [
  { id: "BP-L-001", label: "Inbox", area: "toolbar", confidence: "high" },
  { id: "BP-L-002", label: "Archive", area: "toolbar", confidence: "high" },
  { id: "BP-L-003", label: "Filter", area: "toolbar", confidence: "high" },
  { id: "BP-L-004", label: "Search", area: "toolbar", confidence: "high" },
  { id: "BP-L-005", label: "Add Lead", area: "toolbar", confidence: "high" },
  { id: "BP-L-006", label: "Import Data", area: "toolbar", confidence: "high" },
  { id: "BP-L-007", label: "Export Data", area: "toolbar", confidence: "high" },
  { id: "BP-L-008", label: "Manage Columns", area: "toolbar", confidence: "high" },
  { id: "BP-L-009", label: "Company Name", area: "table", confidence: "high" },
  { id: "BP-L-010", label: "Name", area: "table", confidence: "high" },
  { id: "BP-L-011", label: "Mobile Numbers", area: "table", confidence: "high" },
  { id: "BP-L-012", label: "Emails", area: "table", confidence: "high" },
  { id: "BP-L-013", label: "Labels", area: "table", confidence: "high" },
  { id: "BP-L-014", label: "Source Channel", area: "table", confidence: "high" },
  { id: "BP-L-015", label: "Owner", area: "table", confidence: "high" },
  { id: "BP-L-016", label: "City", area: "table", confidence: "high" }
];
