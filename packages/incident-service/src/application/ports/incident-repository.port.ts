import type { Incident } from "../../domain/entities/incident.entity";

export interface CreateIncidentInput {
  title: string;
  description: string;
  criticality: string;
  serviceAffected: string | null;
  requesterId: string;
  assignedTeamId: string | null;
  assignedToId: string | null;
  /** When true, repository writes incident.created to outbox in same transaction (Outbox Pattern). */
  publishCreatedEvent?: boolean;
  source?: "manual" | "integration";
  externalId?: string | null;
  externalSource?: string | null;
}

export interface IncidentListFilters {
  requesterId?: string;
  status?: string;
  assignedToId?: string;
  assignedTeamId?: string;
  externalId?: string;
  externalSource?: string;
}

export interface IncidentAttachment {
  id: string;
  incidentId: string;
  uploadedById: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface IncidentStatusHistoryEntry {
  id: string;
  incidentId: string;
  fromStatus: string;
  toStatus: string;
  changedById: string | null;
  comment: string | null;
  createdAt: Date;
}

export interface AddIncidentAttachmentInput {
  incidentId: string;
  uploadedById: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
}

export interface IIncidentRepository {
  create(input: CreateIncidentInput): Promise<Incident>;
  findByExternalRef(externalSource: string, externalId: string): Promise<Incident | null>;
  findById(id: string): Promise<Incident | null>;
  findByIdWithComments(id: string): Promise<(Incident & {
    comments: Array<{ id: string; incidentId: string; authorId: string; body: string; createdAt: Date }>;
    statusHistory: IncidentStatusHistoryEntry[];
  }) | null>;
  list(filters: IncidentListFilters): Promise<Incident[]>;
  updateStatus(
    id: string,
    toStatus: string,
    changedById: string | null,
    comment: string | null,
    publishStatusChangedEvent?: boolean
  ): Promise<Incident>;
  assign(
    id: string,
    assignedTeamId: string | null,
    assignedToId: string | null,
    publishAssignedEvent?: boolean
  ): Promise<Incident>;
  addComment(incidentId: string, authorId: string, body: string): Promise<{
    id: string;
    incidentId: string;
    authorId: string;
    body: string;
    createdAt: Date;
  }>;
  addAttachment(input: AddIncidentAttachmentInput): Promise<IncidentAttachment>;
  listAttachments(incidentId: string): Promise<IncidentAttachment[]>;
  setProblemLink(incidentId: string, problemId: string | null): Promise<void>;
}
