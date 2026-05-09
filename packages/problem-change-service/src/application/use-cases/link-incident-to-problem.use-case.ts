import type { IProblemRepository } from "../ports/problem-repository.port";
import { ProblemNotFoundError } from "../errors";

export class LinkIncidentToProblemUseCase {
  constructor(private readonly problemRepository: IProblemRepository) {}

  async execute(problemId: string, incidentId: string): Promise<void> {
    const problem = await this.problemRepository.findById(problemId);
    if (!problem) throw new ProblemNotFoundError(problemId);
    await this.problemRepository.linkIncident(problemId, incidentId);
  }
}
