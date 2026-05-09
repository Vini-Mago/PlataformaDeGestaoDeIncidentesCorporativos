import type { Problem } from "../../domain/entities/problem.entity";
import type { IProblemRepository } from "../ports/problem-repository.port";
import { ProblemNotFoundError } from "../errors";

export type ProblemDetail = Problem & { linkedIncidentIds: string[] };

export class GetProblemUseCase {
  constructor(private readonly problemRepository: IProblemRepository) {}

  async execute(id: string): Promise<ProblemDetail> {
    const problem = await this.problemRepository.findById(id);
    if (!problem) throw new ProblemNotFoundError(id);
    const linkedIncidentIds = await this.problemRepository.getLinkedIncidentIds(id);
    return { ...problem, linkedIncidentIds };
  }
}
