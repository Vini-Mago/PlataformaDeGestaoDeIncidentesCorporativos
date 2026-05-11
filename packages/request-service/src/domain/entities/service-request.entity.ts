/**
 * Service request (RF-6.2): an instance of a request created from a catalog item, with workflow status.
 */
export type ServiceRequestStatus =
  | "Draft"
  | "Submitted"
  | "InApproval"
  | "Approved"
  | "Rejected"
  | "InProgress"
  | "Completed"
  | "Cancelled";

export interface ServiceRequest {
  id: string;
  catalogItemId: string;
  requesterId: string;
  status: ServiceRequestStatus;
  formData: Record<string, unknown> | null;
  assignedTeamId: string | null;
  assignedToId: string | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRequestComment {
  id: string;
  requestId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

/** Registo de uma transição de workflow (RF-6.2 — auditoria). */
export interface ServiceRequestWorkflowEvent {
  id: string;
  requestId: string;
  actorId: string;
  fromStatus: ServiceRequestStatus;
  toStatus: ServiceRequestStatus;
  reason: string | null;
  createdAt: Date;
}
