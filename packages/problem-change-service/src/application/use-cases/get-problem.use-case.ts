import type { IProblemRepository } from "../ports/problem-repository.port";
import { ProblemNotFoundError } from "../errors";

export class GetProblemUseCase {
  constructor(private readonly problemRepository: IProblemRepository) {}

  async execute(id: string) {
    const problem = await this.problemRepository.findById(id);
    if (!problem) throw new ProblemNotFoundError(id);
    return problem;
  }
}
