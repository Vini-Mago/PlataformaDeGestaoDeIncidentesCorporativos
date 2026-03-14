import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateServiceRequestUseCase } from "./create-service-request.use-case";
import { CatalogItemNotFoundError } from "../errors";
import type { IServiceRequestRepository } from "../ports/service-request-repository.port";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";
import type { ServiceCatalogItem } from "../../domain/entities/service-catalog-item.entity";
import type { ServiceRequest } from "../../domain/entities/service-request.entity";

describe("CreateServiceRequestUseCase", () => {
  let requestRepository: IServiceRequestRepository;
  let catalogRepository: IServiceCatalogRepository;

  const catalogItemId = "11111111-1111-1111-1111-111111111111";
  const requesterId = "22222222-2222-2222-2222-222222222222";

  const mockCatalogItem: ServiceCatalogItem = {
    id: catalogItemId,
    name: "Access Request",
    description: "Request system access",
    category: "IT",
    responsibleTeamId: null,
    defaultSlaHours: 24,
    formSchema: null,
    approvalFlow: "none",
    approverRoleIds: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest: ServiceRequest = {
    id: "33333333-3333-3333-3333-333333333333",
    catalogItemId,
    requesterId,
    status: "Draft",
    formData: null,
    assignedTeamId: null,
    assignedToId: null,
    submittedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    requestRepository = {
      create: vi.fn().mockResolvedValue(mockRequest),
      findById: vi.fn(),
      list: vi.fn(),
      updateStatus: vi.fn(),
      addComment: vi.fn(),
      getComments: vi.fn(),
    };
    catalogRepository = {
      findById: vi.fn().mockResolvedValue(mockCatalogItem),
      create: vi.fn(),
      listActive: vi.fn(),
    };
  });

  it("creates a service request successfully with typical dto", async () => {
    const useCase = new CreateServiceRequestUseCase(requestRepository, catalogRepository);
    const dto = { catalogItemId, formData: null };

    const result = await useCase.execute(dto, requesterId);

    expect(result).toEqual(mockRequest);
    expect(catalogRepository.findById).toHaveBeenCalledWith(catalogItemId);
    expect(requestRepository.create).toHaveBeenCalledWith({
      catalogItemId,
      requesterId,
      formData: null,
    });
  });

  it("creates a service request with formData", async () => {
    const useCase = new CreateServiceRequestUseCase(requestRepository, catalogRepository);
    const formData = { reason: "Need access for project X" };
    const dto = { catalogItemId, formData };
    const created = { ...mockRequest, formData };
    vi.mocked(requestRepository.create).mockResolvedValue(created);

    const result = await useCase.execute(dto, requesterId);

    expect(result.formData).toEqual(formData);
    expect(requestRepository.create).toHaveBeenCalledWith({
      catalogItemId,
      requesterId,
      formData,
    });
  });

  it("creates a service request with formData omitted (defaults to null)", async () => {
    const useCase = new CreateServiceRequestUseCase(requestRepository, catalogRepository);
    const dto = { catalogItemId };

    await useCase.execute(dto, requesterId);

    expect(requestRepository.create).toHaveBeenCalledWith({
      catalogItemId,
      requesterId,
      formData: null,
    });
  });

  it("throws CatalogItemNotFoundError when catalog item does not exist", async () => {
    vi.mocked(catalogRepository.findById).mockResolvedValue(null);
    const useCase = new CreateServiceRequestUseCase(requestRepository, catalogRepository);
    const dto = { catalogItemId };

    await expect(useCase.execute(dto, requesterId)).rejects.toThrow(CatalogItemNotFoundError);
    await expect(useCase.execute(dto, requesterId)).rejects.toThrow(
      `Catalog item not found: ${catalogItemId}`
    );
    expect(requestRepository.create).not.toHaveBeenCalled();
  });

  it("handles empty requesterId (unusual: service allows it, repository receives it)", async () => {
    const useCase = new CreateServiceRequestUseCase(requestRepository, catalogRepository);
    const dto = { catalogItemId };

    await useCase.execute(dto, "");

    expect(requestRepository.create).toHaveBeenCalledWith({
      catalogItemId,
      requesterId: "",
      formData: null,
    });
  });
});
