import type { ISlaPolicyRepository } from "../ports/sla-policy-repository.port";
import { SlaPolicyNotFoundError } from "../errors";

export class GetSlaPolicyUseCase {
  constructor(private readonly slaPolicyRepository: ISlaPolicyRepository) {}

  async execute(id: string) {
    const policy = await this.slaPolicyRepository.findById(id);
    if (!policy) throw new SlaPolicyNotFoundError(id);
    return policy;
  }
}
