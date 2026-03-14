import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import type { CreateServiceRequestDto } from "../dtos/create-service-request.dto";
import { CatalogItemNotFoundError } from "../errors";

export class CreateServiceRequestUseCase {
  constructor(
    private readonly requestRepository: IServiceRequestRepository,
    private readonly catalogRepository: IServiceCatalogRepository
  ) {}

  async execute(dto: CreateServiceRequestDto, requesterId: string) {
    const catalogItem = await this.catalogRepository.findById(dto.catalogItemId);
    if (!catalogItem) throw new CatalogItemNotFoundError(dto.catalogItemId);

    const request = await this.requestRepository.create({
      catalogItemId: dto.catalogItemId,
      requesterId,
      formData: dto.formData ?? null,
    });

    return request;
  }
}
