/**
 * Incident aggregate root.
 * Status workflow: Open → InAnalysis → InProgress → PendingCustomer → Resolved → Closed
 */
export type IncidentStatus =
  | "Open"
  | "InAnalysis"
  | "InProgress"
  | "PendingCustomer"
  | "Resolved"
  | "Closed";

export type IncidentCriticality = "Low" | "Medium" | "High" | "Critical";

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  criticality: IncidentCriticality;
  serviceAffected: string | null;
  requesterId: string;
  assignedTeamId: string | null;
  assignedToId: string | null;
  problemId: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
}

export const VALID_STATUSES: IncidentStatus[] = [
  "Open",
  "InAnalysis",
  "InProgress",
  "PendingCustomer",
  "Resolved",
  "Closed",
];

export const VALID_CRITICALITIES: IncidentCriticality[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];
