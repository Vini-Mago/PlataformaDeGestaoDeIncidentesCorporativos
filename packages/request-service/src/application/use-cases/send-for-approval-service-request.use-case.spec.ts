import { beforeEach, describe, expect, it, vi } from "vitest";
import { SendForApprovalServiceRequestUseCase } from "./send-for-approval-service-request.use-case";
import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import type { ServiceRequest } from "../../domain/entities/service-request.entity";
import type { ServiceCatalogItem } from "../../domain/entities/service-catalog-item.entity";

describe("SendForApprovalServiceRequestUseCase", () => {
  let requestRepository: IServiceRequestRepository;
  let catalogRepository: IServiceCatalogRepository;

  const requestId = "11111111-1111-1111-1111-111111111111";
  const actorId = "22222222-2222-2222-2222-222222222222";
  const catalogItemId = "33333333-3333-3333-3333-333333333333";

  const submittedRequest = (overrides: Partial<ServiceRequest> = {}): ServiceRequest => ({
    id: requestId,
    catalogItemId,
    requesterId: "44444444-4444-4444-4444-444444444444",
    status: "Submitted",
    formData: null,
    approvalState: null,
    assignedTeamId: null,
    assignedToId: null,
    submittedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const catalog = (approvalFlow: ServiceCatalogItem["approvalFlow"]): ServiceCatalogItem => ({
    id: catalogItemId,
    name: "Cat",
    description: null,
    category: null,
    responsibleTeamId: null,
    defaultSlaHours: null,
    formSchema: null,
    approvalFlow,
    approverRoleIds: ["gestor", "supervisor"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    requestRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      transition: vi.fn(),
      getWorkflowEvents: vi.fn(),
      addComment: vi.fn(),
      getComments: vi.fn(),
    };
    catalogRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      listActive: vi.fn(),
    };
  });

  it("moves to Approved when flow is none", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(submittedRequest());
    vi.mocked(catalogRepository.findById).mockResolvedValue(catalog("none"));
    vi.mocked(requestRepository.transition).mockResolvedValue(
      submittedRequest({ status: "Approved" })
    );
    const useCase = new SendForApprovalServiceRequestUseCase(requestRepository, catalogRepository);

    await useCase.execute(requestId, actorId);

    expect(requestRepository.transition).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({
        actorId,
        allowedFromStatuses: ["Submitted"],
        toStatus: "Approved",
      })
    );
  });

  it("moves to InApproval and initializes sequential state", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(submittedRequest());
    vi.mocked(catalogRepository.findById).mockResolvedValue(catalog("sequential"));
    vi.mocked(requestRepository.transition).mockResolvedValue(
      submittedRequest({ status: "InApproval", approvalState: { mode: "sequential", step: 0 } })
    );
    const useCase = new SendForApprovalServiceRequestUseCase(requestRepository, catalogRepository);

    await useCase.execute(requestId, actorId);

    expect(requestRepository.transition).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({
        toStatus: "InApproval",
        approvalState: { mode: "sequential", step: 0 },
      })
    );
  });

  it("moves to InApproval and initializes parallel state", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(submittedRequest());
    vi.mocked(catalogRepository.findById).mockResolvedValue(catalog("parallel"));
    vi.mocked(requestRepository.transition).mockResolvedValue(
      submittedRequest({ status: "InApproval", approvalState: { mode: "parallel", roles: [] } })
    );
    const useCase = new SendForApprovalServiceRequestUseCase(requestRepository, catalogRepository);

    await useCase.execute(requestId, actorId);

    expect(requestRepository.transition).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({
        toStatus: "InApproval",
        approvalState: { mode: "parallel", roles: [] },
      })
    );
  });
});
