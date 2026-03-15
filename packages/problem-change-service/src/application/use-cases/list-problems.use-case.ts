import type { IProblemRepository } from "../ports/problem-repository.port";
import type { ProblemStatus } from "../../domain/entities/problem.entity";
import { InvalidProblemStatusFilterError } from "../errors";

export interface ListProblemsInput {
  status?: ProblemStatus;
  createdById?: string;
}

export class ListProblemsUseCase {
  constructor(private readonly problemRepository: IProblemRepository) {}

  async execute(input: ListProblemsInput) {
    return this.problemRepository.list({
      status: input.status,
      createdById: input.createdById,
    });
  }
}

export function parseProblemStatusFilter(value: unknown): ProblemStatus | undefined {
  if (value === undefined || value === "") return undefined;
  const valid: ProblemStatus[] = ["Open", "InAnalysis", "Resolved", "Closed"];
  if (typeof value !== "string" || !valid.includes(value as ProblemStatus)) {
    throw new InvalidProblemStatusFilterError(String(value));
  }
  return value as ProblemStatus;
}
