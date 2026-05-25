import type { Problem, ProblemStatus } from "../../domain/entities/problem.entity";

export interface CreateProblemInput {
  title: string;
  description: string;
  rootCause?: string | null;
  actionPlan?: string | null;
  createdById: string;
  publishCreatedEvent?: boolean;
}

export interface ProblemListFilters {
  status?: string;
  createdById?: string;
}

export interface UpdateProblemPatch {
  status?: ProblemStatus;
  rootCause?: string | null;
  actionPlan?: string | null;
  changedById?: string;
}

export interface IProblemRepository {
  create(input: CreateProblemInput): Promise<Problem>;
  findById(id: string): Promise<Problem | null>;
  update(id: string, patch: UpdateProblemPatch): Promise<Problem | null>;
  list(filters: ProblemListFilters): Promise<Problem[]>;
  getLinkedIncidentIds(problemId: string): Promise<string[]>;
  listLinksForIncidents(
    incidentIds: string[]
  ): Promise<Array<{ incidentId: string; problemId: string; problemTitle: string }>>;
  linkIncident(problemId: string, incidentId: string): Promise<void>;
  unlinkIncident(problemId: string, incidentId: string): Promise<void>;
}
