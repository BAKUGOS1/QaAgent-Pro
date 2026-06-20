# Leads Executable Scenario Catalog

These scenarios are implemented by the deterministic Full Leads MVP runner. Each receives an independent status and evidence row even when the live application blocks execution.

1. `LEAD-001` Login and Leads page load
2. `LEAD-002` Confirmed blueprint controls
3. `LEAD-003` Empty-form validation
4. `LEAD-004` Invalid mobile validation
5. `LEAD-005` Invalid email validation
6. `LEAD-006` Valid lead creation
7. `LEAD-007` Duplicate email/mobile behavior
8. `LEAD-008` Search by contact name
9. `LEAD-009` Search by business name
10. `LEAD-010` Search by mobile
11. `LEAD-011` Search by email
12. `LEAD-012` Lead detail view
13. `LEAD-013` Edit label
14. `LEAD-014` Edit owner
15. `LEAD-015` Edit value
16. `LEAD-016` Edit expected close date
17. `LEAD-017` Edit source channel
18. `LEAD-018` Add note
19. `LEAD-019` Schedule activity
20. `LEAD-020` Call action safety
21. `LEAD-021` Email composer safety
22. `LEAD-022` WhatsApp action safety
23. `LEAD-023` Convert lead to deal
24. `LEAD-024` Archive lead
25. `LEAD-025` Archived lead read-only state
26. `LEAD-026` Unarchive lead
27. `LEAD-027` Bulk archive
28. `LEAD-028` Owner filter
29. `LEAD-029` Label filter
30. `LEAD-030` City filter
31. `LEAD-031` Activity-date filter
32. `LEAD-032` Source-channel filter
33. `LEAD-033` No-activity filter
34. `LEAD-034` Overdue-activity filter
35. `LEAD-035` Combined-filter behavior
36. `LEAD-036` Clear/reset filters
37. `LEAD-037` Company-name sorting
38. `LEAD-038` Contact-name sorting
39. `LEAD-039` Pagination next/previous
40. `LEAD-040` Direct page selection
41. `LEAD-041` Page-size change
42. `LEAD-042` Empty-table state
43. `LEAD-043` Search no-results state
44. `LEAD-044` Business-laptop responsive layout
45. `LEAD-045` Narrow viewport/table usability
46. `LEAD-046` Keyboard and focus navigation
47. `LEAD-047` Accessible names and form labels
48. `LEAD-048` Leads page-load performance
49. `LEAD-049` Search performance
50. `LEAD-050` Save and mutation performance
51. `LEAD-051` Import control conformance
52. `LEAD-052` Export control conformance and safety
53. `LEAD-053` Manage Columns conformance
54. `LEAD-054` Manage Columns persistence
55. `LEAD-055` Complete mutation persistence matrix
56. `LEAD-056` Cleanup and recovery reconciliation

Every mutation scenario must validate the visible UI, relevant network result, refresh or navigation persistence, and search/table persistence where applicable.
