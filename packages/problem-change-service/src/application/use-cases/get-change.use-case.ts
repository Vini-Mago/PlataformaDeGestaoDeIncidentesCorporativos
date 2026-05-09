import type { Change } from "../../domain/entities/change.entity";
import type { IChangeRepository } from "../ports/change-repository.port";
import { ChangeNotFoundError } from "../errors";

export type ChangeDetail = Change & {
  linkedIncidentIds: string[];
  linkedProblemIds: string[];
};

export class GetChangeUseCase {
  constructor(private readonly changeRepository: IChangeRepository) {}

  async execute(id: string): Promise<ChangeDetail> {
    const change = await this.changeRepository.findById(id);
    if (!change) {
      throw new ChangeNotFoundError(id);
    }
    const [linkedIncidentIds, linkedProblemIds] = await Promise.all([
      this.changeRepository.getLinkedIncidentIds(id),
      this.changeRepository.getLinkedProblemIds(id),
    ]);
    return { ...change, linkedIncidentIds, linkedProblemIds };
  }
}
