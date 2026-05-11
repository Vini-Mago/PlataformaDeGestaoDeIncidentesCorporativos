import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import {
  ServiceRequestNotFoundError,
  CatalogItemNotFoundError,
  InvalidStatusTransitionError,
  ServiceRequestApproverRoleForbiddenError,
  ServiceRequestSequentialApprovalTurnError,
  ServiceRequestParallelApprovalDuplicateError,
} from "../errors";
import { canApproveWithCatalogRoles } from "../helpers/service-request-approver.helper";
import { readParallelApprovedRoles, readSequentialStep, uniqueApproverRoles } from "../../domain/approval-state";

export class ApproveServiceRequestUseCase {
  constructor(
    private readonly requestRepository: IServiceRequestRepository,
    private readonly catalogRepository: IServiceCatalogRepository
  ) {}

  async execute(requestId: string, actorId: string, userRole: string | undefined) {
    const request = await this.requestRepository.findById(requestId);
    if (!request) throw new ServiceRequestNotFoundError(requestId);
    if (request.status !== "InApproval") {
      throw new InvalidStatusTransitionError(request.status, "Approved");
    }
    const catalog = await this.catalogRepository.findById(request.catalogItemId);
    if (!catalog) throw new CatalogItemNotFoundError(request.catalogItemId);

    const isAdminRole = userRole === "admin";
    const flow = catalog.approvalFlow;
    const role = userRole ?? "";

    if (isAdminRole) {
      return this.requestRepository.transition(requestId, {
        actorId,
        allowedFromStatuses: ["InApproval"],
        toStatus: "Approved",
        approvalState: null,
      });
    }

    if (flow === "single" || flow === "none") {
      if (!canApproveWithCatalogRoles({ userRole, isAdminRole: false, approverRoleIds: catalog.approverRoleIds })) {
        throw new ServiceRequestApproverRoleForbiddenError();
      }
      return this.requestRepository.transition(requestId, {
        actorId,
        allowedFromStatuses: ["InApproval"],
        toStatus: "Approved",
        approvalState: null,
      });
    }

    if (flow === "sequential") {
      const step = readSequentialStep(request.approvalState);
      const requiredRole = catalog.approverRoleIds[step];
      if (requiredRole === undefined) {
        throw new ServiceRequestApproverRoleForbiddenError();
      }
      if (role !== requiredRole) {
        throw new ServiceRequestSequentialApprovalTurnError(requiredRole);
      }
      const lastIndex = catalog.approverRoleIds.length - 1;
      if (step >= lastIndex) {
        return this.requestRepository.transition(requestId, {
          actorId,
          allowedFromStatuses: ["InApproval"],
          toStatus: "Approved",
          approvalState: null,
        });
      }
      return this.requestRepository.transition(requestId, {
        actorId,
        allowedFromStatuses: ["InApproval"],
        toStatus: "InApproval",
        approvalState: { mode: "sequential", step: step + 1 },
        reason: `sequential:step:${step + 1}/${catalog.approverRoleIds.length}`,
        skipOutbox: true,
      });
    }

    if (flow === "parallel") {
      if (!canApproveWithCatalogRoles({ userRole, isAdminRole: false, approverRoleIds: catalog.approverRoleIds })) {
        throw new ServiceRequestApproverRoleForbiddenError();
      }
      const uniq = uniqueApproverRoles(catalog.approverRoleIds);
      const approved = readParallelApprovedRoles(request.approvalState);
      if (approved.includes(role)) {
        throw new ServiceRequestParallelApprovalDuplicateError();
      }
      const nextRoles = [...approved, role];
      const allDone = uniq.every((r) => nextRoles.includes(r));
      if (allDone) {
        return this.requestRepository.transition(requestId, {
          actorId,
          allowedFromStatuses: ["InApproval"],
          toStatus: "Approved",
          approvalState: null,
        });
      }
      return this.requestRepository.transition(requestId, {
        actorId,
        allowedFromStatuses: ["InApproval"],
        toStatus: "InApproval",
        approvalState: { mode: "parallel", roles: nextRoles },
        reason: `parallel:${nextRoles.length}/${uniq.length}`,
        skipOutbox: true,
      });
    }

    throw new ServiceRequestApproverRoleForbiddenError();
  }
}
