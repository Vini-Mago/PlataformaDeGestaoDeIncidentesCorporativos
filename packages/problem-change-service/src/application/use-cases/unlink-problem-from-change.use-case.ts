import type { IChangeRepository } from "../ports/change-repository.port";
import { ChangeNotFoundError } from "../errors";

export class UnlinkProblemFromChangeUseCase {
  constructor(private readonly changeRepository: IChangeRepository) {}

  async execute(changeId: string, problemId: string): Promise<void> {
    const change = await this.changeRepository.findById(changeId);
    if (!change) {
      throw new ChangeNotFoundError(changeId);
    }
    await this.changeRepository.unlinkProblem(changeId, problemId);
  }
}
