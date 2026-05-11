import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import { CatalogItemNotFoundError, ServiceRequestNotFoundError } from "../errors";
import { validateServiceRequestFormData } from "../services/validate-service-request-form-data";

export class SubmitServiceRequestUseCase {
  constructor(
    private readonly requestRepository: IServiceRequestRepository,
    private readonly catalogRepository: IServiceCatalogRepository
  ) {}

  async execute(requestId: string, actorId: string) {
    const request = await this.requestRepository.findById(requestId);
    if (!request) throw new ServiceRequestNotFoundError(requestId);

    const catalog = await this.catalogRepository.findById(request.catalogItemId);
    if (!catalog) throw new CatalogItemNotFoundError(request.catalogItemId);

    validateServiceRequestFormData(request.formData, catalog.formSchema);

    const submittedAt = new Date();
    return this.requestRepository.transition(requestId, {
      actorId,
      allowedFromStatuses: ["Draft"],
      toStatus: "Submitted",
      submittedAt,
    });
  }
}
