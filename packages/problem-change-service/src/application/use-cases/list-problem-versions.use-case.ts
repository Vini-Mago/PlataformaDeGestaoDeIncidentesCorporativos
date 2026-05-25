import { ProblemNotFoundError } from "../errors";
import type { IProblemRepository } from "../ports/problem-repository.port";
import type { EntityVersionRecord, IVersionHistoryRepository } from "../ports/version-history.port";

export class ListProblemVersionsUseCase {
  constructor(
    private readonly problemRepository: IProblemRepository,
    private readonly versionHistoryRepository: IVersionHistoryRepository
  ) {}

  async execute(problemId: string, limit = 50): Promise<EntityVersionRecord[]> {
    const problem = await this.problemRepository.findById(problemId);
    if (!problem) {
      throw new ProblemNotFoundError(problemId);
    }
    return this.versionHistoryRepository.listProblemVersions(problemId, limit);
  }
}
