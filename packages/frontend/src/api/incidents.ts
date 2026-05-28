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
  assignedTeamId?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
};

export type IncidentCriticality = "Low" | "Medium" | "High" | "Critical";

export type CreateIncidentPayload = {
  title: string;
  description: string;
  criticality: IncidentCriticality;
  serviceAffected?: string | null;
};

export type IncidentAttachment = {
  id: string;
  incidentId: string;
  uploadedById: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type AddIncidentAttachmentPayload = {
  fileName: string;
  mimeType: "image/png" | "image/jpeg" | "application/pdf" | "text/plain";
  contentBase64: string;
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

export async function fetchIncidentAttachments(incidentId: string): Promise<IncidentAttachment[]> {
  return bffFetchJson<IncidentAttachment[]>(`/incidents/incidents/${incidentId}/attachments`);
}

export async function addIncidentAttachment(
  incidentId: string,
  payload: AddIncidentAttachmentPayload
): Promise<IncidentAttachment> {
  return bffFetchJson<IncidentAttachment>(`/incidents/incidents/${incidentId}/attachments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
