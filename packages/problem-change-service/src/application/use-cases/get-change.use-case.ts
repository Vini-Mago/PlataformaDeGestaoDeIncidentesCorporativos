import type { IChangeRepository } from "../ports/change-repository.port";
import { ChangeNotFoundError } from "../errors";

export class GetChangeUseCase {
  constructor(private readonly changeRepository: IChangeRepository) {}

  async execute(id: string) {
    const change = await this.changeRepository.findById(id);
    if (!change) throw new ChangeNotFoundError(id);
    return change;
  }
}
