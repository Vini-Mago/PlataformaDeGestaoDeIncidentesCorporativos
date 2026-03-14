import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import { CatalogItemNotFoundError } from "../errors";

export class GetCatalogItemUseCase {
  constructor(private readonly catalogRepository: IServiceCatalogRepository) {}

  async execute(id: string) {
    const item = await this.catalogRepository.findById(id);
    if (!item) throw new CatalogItemNotFoundError(id);
    return item;
  }
}
