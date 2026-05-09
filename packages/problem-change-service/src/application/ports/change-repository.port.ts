import type { Change, ChangeRisk, ChangeStatus, ChangeType } from "../../domain/entities/change.entity";

export interface CreateChangeInput {
  title: string;
  description: string;
  justification: string;
  changeType: string;
  risk: string;
  windowStart?: Date | null;
  windowEnd?: Date | null;
  rollbackPlan?: string | null;
  createdById: string;
  publishCreatedEvent?: boolean;
}

export interface ChangeListFilters {
  status?: string;
  createdById?: string;
  risk?: string;
}

export interface UpdateChangePatch {
  status?: ChangeStatus;
  title?: string;
  description?: string;
  justification?: string;
  changeType?: ChangeType;
  risk?: ChangeRisk;
  windowStart?: Date | null;
  windowEnd?: Date | null;
  rollbackPlan?: string | null;
}

export interface IChangeRepository {
  create(input: CreateChangeInput): Promise<Change>;
  findById(id: string): Promise<Change | null>;
  list(filters: ChangeListFilters): Promise<Change[]>;
  update(id: string, patch: UpdateChangePatch): Promise<Change | null>;
  getLinkedIncidentIds(changeId: string): Promise<string[]>;
  getLinkedProblemIds(changeId: string): Promise<string[]>;
  linkIncident(changeId: string, incidentId: string): Promise<void>;
  unlinkIncident(changeId: string, incidentId: string): Promise<void>;
  linkProblem(changeId: string, problemId: string): Promise<void>;
  unlinkProblem(changeId: string, problemId: string): Promise<void>;
}
