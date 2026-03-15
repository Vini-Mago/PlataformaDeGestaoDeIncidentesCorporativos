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
}

export interface IncidentListFilters {
  requesterId?: string;
  status?: string;
  assignedToId?: string;
  assignedTeamId?: string;
}

export interface IIncidentRepository {
  create(input: CreateIncidentInput): Promise<Incident>;
  findById(id: string): Promise<Incident | null>;
  findByIdWithComments(id: string): Promise<(Incident & { comments: Array<{ id: string; authorId: string; body: string; createdAt: Date }> }) | null>;
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
}
