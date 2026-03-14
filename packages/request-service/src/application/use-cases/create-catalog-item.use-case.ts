import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import type { CreateCatalogItemDto } from "../dtos/create-catalog-item.dto";

export class CreateCatalogItemUseCase {
  constructor(private readonly catalogRepository: IServiceCatalogRepository) {}

  async execute(dto: CreateCatalogItemDto) {
    return this.catalogRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category ?? null,
      responsibleTeamId: dto.responsibleTeamId ?? null,
      defaultSlaHours: dto.defaultSlaHours ?? null,
      formSchema: dto.formSchema ?? null,
      approvalFlow: dto.approvalFlow ?? "none",
      approverRoleIds: dto.approverRoleIds ?? [],
    });
  }
}
