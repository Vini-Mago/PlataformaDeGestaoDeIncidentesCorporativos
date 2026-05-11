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

export type ServiceRequestComment = {
  id: string;
  requestId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type ServiceRequestWorkflowEvent = {
  id: string;
  requestId: string;
  actorId: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  createdAt: string;
};

export type ServiceRequestDetail = ServiceRequestListItem & {
  comments: ServiceRequestComment[];
  workflowEvents: ServiceRequestWorkflowEvent[];
};

/** Lista pública de itens ativos do catálogo (via BFF). */
export type CatalogItemSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  approvalFlow?: "none" | "single" | "sequential" | "parallel";
  approverRoleIds?: string[];
};

export type CreateServiceRequestPayload = {
  catalogItemId: string;
  formData?: Record<string, unknown> | null;
};

export async function fetchServiceRequests(): Promise<ServiceRequestListItem[]> {
  return bffFetchJson<ServiceRequestListItem[]>("/request/service-requests");
}

export async function fetchServiceRequestById(id: string): Promise<ServiceRequestDetail> {
  return bffFetchJson<ServiceRequestDetail>(`/request/service-requests/${encodeURIComponent(id)}`);
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

async function postServiceRequestTransition(
  path: string,
  body?: Record<string, unknown>
): Promise<ServiceRequestListItem> {
  return bffFetchJson<ServiceRequestListItem>(path, {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body) } : { body: "{}" }),
  });
}

export function submitServiceRequest(id: string): Promise<ServiceRequestListItem> {
  return postServiceRequestTransition(`/request/service-requests/${encodeURIComponent(id)}/submit`);
}

export function sendServiceRequestForApproval(id: string): Promise<ServiceRequestListItem> {
  return postServiceRequestTransition(
    `/request/service-requests/${encodeURIComponent(id)}/send-for-approval`
  );
}

export function approveServiceRequest(id: string): Promise<ServiceRequestListItem> {
  return postServiceRequestTransition(`/request/service-requests/${encodeURIComponent(id)}/approve`);
}

export function rejectServiceRequest(
  id: string,
  payload?: { reason?: string }
): Promise<ServiceRequestListItem> {
  const body: Record<string, unknown> = {};
  if (payload?.reason !== undefined && payload.reason !== "") {
    body.reason = payload.reason;
  }
  return postServiceRequestTransition(
    `/request/service-requests/${encodeURIComponent(id)}/reject`,
    Object.keys(body).length > 0 ? body : undefined
  );
}

export function startServiceRequest(id: string): Promise<ServiceRequestListItem> {
  return postServiceRequestTransition(`/request/service-requests/${encodeURIComponent(id)}/start`);
}

export function completeServiceRequest(id: string): Promise<ServiceRequestListItem> {
  return postServiceRequestTransition(`/request/service-requests/${encodeURIComponent(id)}/complete`);
}
