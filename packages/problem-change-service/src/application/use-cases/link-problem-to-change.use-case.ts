import type { IChangeRepository } from "../ports/change-repository.port";
import type { IProblemRepository } from "../ports/problem-repository.port";
import { ChangeNotFoundError, ProblemNotFoundError } from "../errors";

export class LinkProblemToChangeUseCase {
  constructor(
    private readonly changeRepository: IChangeRepository,
    private readonly problemRepository: IProblemRepository
  ) {}

  async execute(changeId: string, problemId: string): Promise<void> {
    const [change, problem] = await Promise.all([
      this.changeRepository.findById(changeId),
      this.problemRepository.findById(problemId),
    ]);
    if (!change) {
      throw new ChangeNotFoundError(changeId);
    }
    if (!problem) {
      throw new ProblemNotFoundError(problemId);
    }
    await this.changeRepository.linkProblem(changeId, problemId);
  }
}
