import type { Change } from "../../domain/entities/change.entity";

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

export interface IChangeRepository {
  create(input: CreateChangeInput): Promise<Change>;
  findById(id: string): Promise<Change | null>;
  list(filters: ChangeListFilters): Promise<Change[]>;
}
