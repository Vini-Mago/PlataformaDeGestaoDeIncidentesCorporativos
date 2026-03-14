import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";

export class ListCatalogItemsUseCase {
  constructor(private readonly catalogRepository: IServiceCatalogRepository) {}

  async execute() {
    return this.catalogRepository.listActive();
  }
}
