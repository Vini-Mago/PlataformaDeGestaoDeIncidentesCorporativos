import { bffFetchJson } from "./http";

export type SlaAssignmentRecord = {
  id: string;
  ticketId: string;
  ticketType: string;
  policyId: string;
  responseDeadline: string;
  resolutionDeadline: string;
  clockStartedAt: string;
  status: "active" | "paused" | "completed";
  riskEmitted: boolean;
  responseBreachEmitted: boolean;
  resolutionBreachEmitted: boolean;
};

export async function fetchSlaAssignment(ticketId: string, ticketType: string = "incident"): Promise<SlaAssignmentRecord[]> {
  // It returns a single assignment or null
  const assignment = await bffFetchJson<SlaAssignmentRecord | null>(`/sla/assignments/ticket/${ticketType}/${ticketId}`);
  return assignment ? [assignment] : [];
}
