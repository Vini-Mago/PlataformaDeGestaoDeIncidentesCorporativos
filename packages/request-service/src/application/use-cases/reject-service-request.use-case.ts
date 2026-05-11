import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import {
  ServiceRequestNotFoundError,
  CatalogItemNotFoundError,
  InvalidStatusTransitionError,
  ServiceRequestApproverRoleForbiddenError,
} from "../errors";
import { canApproveWithCatalogRoles } from "../helpers/service-request-approver.helper";

export class RejectServiceRequestUseCase {
  constructor(
    private readonly requestRepository: IServiceRequestRepository,
    private readonly catalogRepository: IServiceCatalogRepository
  ) {}

  async execute(requestId: string, actorId: string, userRole: string | undefined, reason: string | null) {
    const request = await this.requestRepository.findById(requestId);
    if (!request) throw new ServiceRequestNotFoundError(requestId);
    if (request.status !== "InApproval") {
      throw new InvalidStatusTransitionError(request.status, "Rejected");
    }
    const catalog = await this.catalogRepository.findById(request.catalogItemId);
    if (!catalog) throw new CatalogItemNotFoundError(request.catalogItemId);

    const isAdminRole = userRole === "admin";
    if (!canApproveWithCatalogRoles({ userRole, isAdminRole, approverRoleIds: catalog.approverRoleIds })) {
      throw new ServiceRequestApproverRoleForbiddenError();
    }

    return this.requestRepository.transition(requestId, {
      actorId,
      allowedFromStatuses: ["InApproval"],
      toStatus: "Rejected",
      reason,
    });
  }
}
