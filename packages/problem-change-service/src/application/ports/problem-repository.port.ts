import type { Problem } from "../../domain/entities/problem.entity";

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

export interface IProblemRepository {
  create(input: CreateProblemInput): Promise<Problem>;
  findById(id: string): Promise<Problem | null>;
  list(filters: ProblemListFilters): Promise<Problem[]>;
}
