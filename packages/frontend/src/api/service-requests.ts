import { bffFetchJson } from "./http";

/** Campos principais devolvidos pelo request-service (JSON). */
export type ServiceRequestListItem = {
  id: string;
  catalogItemId: string;
  requesterId: string;
  status: string;
  formData: Record<string, unknown> | null;
  assignedTeamId: string | null;
  assignedToId: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** Lista pública de itens ativos do catálogo (via BFF). */
export type CatalogItemSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
};

export type CreateServiceRequestPayload = {
  catalogItemId: string;
  formData?: Record<string, unknown> | null;
};

export async function fetchServiceRequests(): Promise<ServiceRequestListItem[]> {
  return bffFetchJson<ServiceRequestListItem[]>("/request/service-requests");
}

export async function fetchCatalogItems(): Promise<CatalogItemSummary[]> {
  return bffFetchJson<CatalogItemSummary[]>("/request/catalog-items");
}

export async function createServiceRequest(
  payload: CreateServiceRequestPayload
): Promise<ServiceRequestListItem> {
  return bffFetchJson<ServiceRequestListItem>("/request/service-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
