import { bffFetchJson } from "./http";

/** Resposta do incident-service (campos principais para UI). */
export type IncidentListItem = {
  id: string;
  title: string;
  description?: string;
  status: string;
  criticality: string;
  serviceAffected?: string | null;
  requesterId: string;
  createdAt?: string;
};

export type IncidentCriticality = "Low" | "Medium" | "High" | "Critical";

export type CreateIncidentPayload = {
  title: string;
  description: string;
  criticality: IncidentCriticality;
  serviceAffected?: string | null;
};

export async function fetchIncidents(): Promise<IncidentListItem[]> {
  return bffFetchJson<IncidentListItem[]>("/incidents/incidents");
}

export async function createIncident(payload: CreateIncidentPayload): Promise<IncidentListItem> {
  return bffFetchJson<IncidentListItem>("/incidents/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
