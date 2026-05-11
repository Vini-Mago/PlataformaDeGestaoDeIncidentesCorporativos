import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import { ServiceRequestNotFoundError, CatalogItemNotFoundError, InvalidStatusTransitionError } from "../errors";
import { catalogRequiresInApprovalQueue } from "../../domain/catalog-approval-policy";
import { initialApprovalStateForCatalog } from "../../domain/approval-state";

export class SendForApprovalServiceRequestUseCase {
  constructor(
    private readonly requestRepository: IServiceRequestRepository,
    private readonly catalogRepository: IServiceCatalogRepository
  ) {}

  async execute(requestId: string, actorId: string) {
    const request = await this.requestRepository.findById(requestId);
    if (!request) throw new ServiceRequestNotFoundError(requestId);
    if (request.status !== "Submitted") {
      const target = "InApproval or Approved";
      throw new InvalidStatusTransitionError(request.status, target);
    }
    const catalog = await this.catalogRepository.findById(request.catalogItemId);
    if (!catalog) throw new CatalogItemNotFoundError(request.catalogItemId);

    const toStatus = catalogRequiresInApprovalQueue(catalog) ? "InApproval" : "Approved";
    if (toStatus === "InApproval") {
      const approvalState = initialApprovalStateForCatalog(catalog);
      return this.requestRepository.transition(requestId, {
        actorId,
        allowedFromStatuses: ["Submitted"],
        toStatus,
        approvalState,
      });
    }
    return this.requestRepository.transition(requestId, {
      actorId,
      allowedFromStatuses: ["Submitted"],
      toStatus,
    });
  }
}
