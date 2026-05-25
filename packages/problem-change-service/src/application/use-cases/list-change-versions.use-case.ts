import { ChangeNotFoundError } from "../errors";
import type { IChangeRepository } from "../ports/change-repository.port";
import type { EntityVersionRecord, IVersionHistoryRepository } from "../ports/version-history.port";

export class ListChangeVersionsUseCase {
  constructor(
    private readonly changeRepository: IChangeRepository,
    private readonly versionHistoryRepository: IVersionHistoryRepository
  ) {}

  async execute(changeId: string, limit = 50): Promise<EntityVersionRecord[]> {
    const change = await this.changeRepository.findById(changeId);
    if (!change) {
      throw new ChangeNotFoundError(changeId);
    }
    return this.versionHistoryRepository.listChangeVersions(changeId, limit);
  }
}
