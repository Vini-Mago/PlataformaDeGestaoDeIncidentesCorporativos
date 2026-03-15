import type { IChangeRepository } from "../ports/change-repository.port";
import type { CreateChangeDto } from "../dtos/create-change.dto";

export class CreateChangeUseCase {
  constructor(private readonly changeRepository: IChangeRepository) {}

  async execute(dto: CreateChangeDto, createdById: string) {
    return this.changeRepository.create({
      title: dto.title,
      description: dto.description,
      justification: dto.justification,
      changeType: dto.changeType,
      risk: dto.risk,
      windowStart: dto.windowStart ? new Date(dto.windowStart) : null,
      windowEnd: dto.windowEnd ? new Date(dto.windowEnd) : null,
      rollbackPlan: dto.rollbackPlan ?? null,
      createdById,
      publishCreatedEvent: true,
    });
  }
}
