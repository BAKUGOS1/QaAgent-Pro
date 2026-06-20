export interface LeadsScenarioDefinition {
  id: string;
  title: string;
  riskScore: number;
  mutation: boolean;
}

const titles = [
  "Login and Leads page load", "Confirmed blueprint controls", "Empty-form validation",
  "Invalid mobile validation", "Invalid email validation", "Valid lead creation",
  "Duplicate email/mobile behavior", "Search by contact name", "Search by business name",
  "Search by mobile", "Search by email", "Lead detail view", "Edit label", "Edit owner",
  "Edit value", "Edit expected close date", "Edit source channel", "Add note",
  "Schedule activity", "Call action safety", "Email composer safety", "WhatsApp action safety",
  "Convert lead to deal", "Archive lead", "Archived lead read-only state", "Unarchive lead",
  "Bulk archive", "Owner filter", "Label filter", "City filter", "Activity-date filter",
  "Source-channel filter", "No-activity filter", "Overdue-activity filter",
  "Combined-filter behavior", "Clear/reset filters", "Company-name sorting",
  "Contact-name sorting", "Pagination next/previous", "Direct page selection",
  "Page-size change", "Empty-table state", "Search no-results state",
  "Business-laptop responsive layout", "Narrow viewport/table usability",
  "Keyboard and focus navigation", "Accessible names and form labels",
  "Leads page-load performance", "Search performance", "Save and mutation performance",
  "Import control conformance", "Export control conformance and safety",
  "Manage Columns conformance", "Manage Columns persistence",
  "Complete mutation persistence matrix", "Cleanup and recovery reconciliation"
] as const;

const mutationIds = new Set([
  6, 7, 13, 14, 15, 16, 17, 18, 19, 23, 24, 26, 27, 50, 54, 55, 56
]);

export const leadsScenarios: LeadsScenarioDefinition[] = titles.map((title, index) => {
  const number = index + 1;
  return {
    id: `LEAD-${String(number).padStart(3, "0")}`,
    title,
    riskScore: number <= 7 || [23, 24, 25, 26, 27, 55, 56].includes(number) ? 20 : number >= 48 && number <= 50 ? 12 : 8,
    mutation: mutationIds.has(number)
  };
});
