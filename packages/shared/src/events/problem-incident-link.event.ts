/**
 * Domain events: incident/problem link lifecycle.
 * Published by problem-change-service when an incident is linked/unlinked to a problem.
 * Consumed by incident-service to keep Incident.problemId in sync.
 */
export interface ProblemIncidentLinkPayload {
  problemId: string;
  incidentId: string;
  occurredAt: string;
}

export const PROBLEM_INCIDENT_LINKED_EVENT = "problem.incident_linked";
export const PROBLEM_INCIDENT_UNLINKED_EVENT = "problem.incident_unlinked";
