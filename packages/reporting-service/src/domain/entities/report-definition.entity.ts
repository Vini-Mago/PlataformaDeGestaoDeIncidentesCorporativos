/**
 * Report definition entity — saved report config for KPIs, dashboards, export (RF-4.x).
 * Domain-only; no framework imports.
 */
export interface ReportDefinition {
  id: string;
  name: string;
  description: string | null;
  reportType: ReportType;
  filters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportType =
  | "incidents_summary"
  | "kpi_dashboard"
  | "sla_compliance"
  | "custom";

export const VALID_REPORT_TYPES: ReportType[] = [
  "incidents_summary",
  "kpi_dashboard",
  "sla_compliance",
  "custom",
];
