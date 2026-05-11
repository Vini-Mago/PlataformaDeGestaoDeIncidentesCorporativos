import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApproveServiceRequestUseCase } from "./approve-service-request.use-case";
import {
  ServiceRequestNotFoundError,
  ServiceRequestApproverRoleForbiddenError,
  ServiceRequestSequentialApprovalTurnError,
  ServiceRequestParallelApprovalDuplicateError,
} from "../errors";
import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import type { ServiceCatalogItem } from "../../domain/entities/service-catalog-item.entity";
import type { ServiceRequest } from "../../domain/entities/service-request.entity";

describe("ApproveServiceRequestUseCase", () => {
  let requestRepository: IServiceRequestRepository;
  let catalogRepository: IServiceCatalogRepository;

  const requestId = "11111111-1111-1111-1111-111111111111";
  const catalogItemId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  const actorId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const baseCatalog = (over: Partial<ServiceCatalogItem> = {}): ServiceCatalogItem => ({
    id: catalogItemId,
    name: "Cat",
    description: null,
    category: null,
    responsibleTeamId: null,
    defaultSlaHours: null,
    formSchema: null,
    approvalFlow: "single",
    approverRoleIds: ["gestor"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

  const inApproval = (over: Partial<ServiceRequest> = {}): ServiceRequest => ({
    id: requestId,
    catalogItemId,
    requesterId: "req-user",
    status: "InApproval",
    formData: null,
    approvalState: null,
    assignedTeamId: null,
    assignedToId: null,
    submittedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

  beforeEach(() => {
    requestRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      transition: vi.fn().mockImplementation((_id, p) =>
        Promise.resolve(
          inApproval({
            status: p.toStatus as ServiceRequest["status"],
            approvalState: p.approvalState === undefined ? null : p.approvalState,
          })
        )
      ),
      getWorkflowEvents: vi.fn(),
      addComment: vi.fn(),
      getComments: vi.fn(),
    };
    catalogRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      listActive: vi.fn(),
    };
  });

  it("single: approver in list transitions to Approved", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(inApproval());
    vi.mocked(catalogRepository.findById).mockResolvedValue(baseCatalog({ approvalFlow: "single" }));
    const uc = new ApproveServiceRequestUseCase(requestRepository, catalogRepository);

    await uc.execute(requestId, actorId, "gestor");

    expect(requestRepository.transition).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({ toStatus: "Approved", approvalState: null })
    );
  });

  it("admin approves without catalog role check", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(inApproval());
    vi.mocked(catalogRepository.findById).mockResolvedValue(baseCatalog({ approverRoleIds: ["gestor"] }));
    const uc = new ApproveServiceRequestUseCase(requestRepository, catalogRepository);

    await uc.execute(requestId, actorId, "admin");

    expect(requestRepository.transition).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({ toStatus: "Approved" })
    );
  });

  it("sequential: wrong role at step throws", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(
      inApproval({ approvalState: { mode: "sequential", step: 0 } })
    );
    vi.mocked(catalogRepository.findById).mockResolvedValue(
      baseCatalog({
        approvalFlow: "sequential",
        approverRoleIds: ["gestor", "supervisor"],
      })
    );
    const uc = new ApproveServiceRequestUseCase(requestRepository, catalogRepository);

    await expect(uc.execute(requestId, actorId, "supervisor")).rejects.toThrow(ServiceRequestSequentialApprovalTurnError);
    expect(requestRepository.transition).not.toHaveBeenCalled();
  });

  it("sequential: first approver stays InApproval with skipOutbox milestone", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(
      inApproval({ approvalState: { mode: "sequential", step: 0 } })
    );
    vi.mocked(catalogRepository.findById).mockResolvedValue(
      baseCatalog({
        approvalFlow: "sequential",
        approverRoleIds: ["gestor", "supervisor"],
      })
    );
    const uc = new ApproveServiceRequestUseCase(requestRepository, catalogRepository);

    await uc.execute(requestId, actorId, "gestor");

    expect(requestRepository.transition).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({
        toStatus: "InApproval",
        skipOutbox: true,
        approvalState: { mode: "sequential", step: 1 },
      })
    );
  });

  it("sequential: last step goes to Approved", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(
      inApproval({ approvalState: { mode: "sequential", step: 1 } })
    );
    vi.mocked(catalogRepository.findById).mockResolvedValue(
      baseCatalog({
        approvalFlow: "sequential",
        approverRoleIds: ["gestor", "supervisor"],
      })
    );
    const uc = new ApproveServiceRequestUseCase(requestRepository, catalogRepository);

    await uc.execute(requestId, actorId, "supervisor");

    expect(requestRepository.transition).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({ toStatus: "Approved", approvalState: null })
    );
  });

  it("parallel: duplicate role throws", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(
      inApproval({ approvalState: { mode: "parallel", roles: ["gestor"] } })
    );
    vi.mocked(catalogRepository.findById).mockResolvedValue(
      baseCatalog({
        approvalFlow: "parallel",
        approverRoleIds: ["gestor", "supervisor"],
      })
    );
    const uc = new ApproveServiceRequestUseCase(requestRepository, catalogRepository);

    await expect(uc.execute(requestId, actorId, "gestor")).rejects.toThrow(ServiceRequestParallelApprovalDuplicateError);
  });

  it("parallel: first approval stays InApproval", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(
      inApproval({ approvalState: { mode: "parallel", roles: [] } })
    );
    vi.mocked(catalogRepository.findById).mockResolvedValue(
      baseCatalog({
        approvalFlow: "parallel",
        approverRoleIds: ["gestor", "supervisor"],
      })
    );
    const uc = new ApproveServiceRequestUseCase(requestRepository, catalogRepository);

    await uc.execute(requestId, actorId, "gestor");

    expect(requestRepository.transition).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({
        toStatus: "InApproval",
        skipOutbox: true,
        approvalState: { mode: "parallel", roles: ["gestor"] },
      })
    );
  });

  it("throws ServiceRequestNotFoundError when missing", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(null);
    vi.mocked(catalogRepository.findById).mockResolvedValue(baseCatalog());
    const uc = new ApproveServiceRequestUseCase(requestRepository, catalogRepository);

    await expect(uc.execute(requestId, actorId, "gestor")).rejects.toThrow(ServiceRequestNotFoundError);
  });

  it("single: role not in list throws", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(inApproval());
    vi.mocked(catalogRepository.findById).mockResolvedValue(baseCatalog({ approverRoleIds: ["gestor"] }));
    const uc = new ApproveServiceRequestUseCase(requestRepository, catalogRepository);

    await expect(uc.execute(requestId, actorId, "other")).rejects.toThrow(ServiceRequestApproverRoleForbiddenError);
  });
});
