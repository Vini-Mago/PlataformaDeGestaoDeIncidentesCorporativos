import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateCatalogItemUseCase } from "./create-catalog-item.use-case";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";

describe("CreateCatalogItemUseCase", () => {
  let catalogRepository: IServiceCatalogRepository;

  const mockCatalogItem = {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Access Request",
    description: "Request system access",
    category: "IT",
    responsibleTeamId: null,
    defaultSlaHours: 24,
    formSchema: null,
    approvalFlow: "none" as const,
    approverRoleIds: [] as string[],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    catalogRepository = {
      create: vi.fn().mockResolvedValue(mockCatalogItem),
      findById: vi.fn(),
      listActive: vi.fn(),
    };
  });

  it("creates a catalog item with typical dto", async () => {
    const useCase = new CreateCatalogItemUseCase(catalogRepository);
    const dto = {
      name: "Access Request",
      description: "Request system access",
      category: "IT",
    };

    const result = await useCase.execute(dto);

    expect(result).toEqual(mockCatalogItem);
    expect(catalogRepository.create).toHaveBeenCalledWith({
      name: "Access Request",
      description: "Request system access",
      category: "IT",
      responsibleTeamId: null,
      defaultSlaHours: null,
      formSchema: null,
      approvalFlow: "none",
      approverRoleIds: [],
    });
  });

  it("creates with minimal dto (name only)", async () => {
    const useCase = new CreateCatalogItemUseCase(catalogRepository);
    const dto = { name: "Minimal Item" };
    vi.mocked(catalogRepository.create).mockResolvedValue({
      ...mockCatalogItem,
      name: "Minimal Item",
      description: null,
    });

    const result = await useCase.execute(dto);

    expect(result.name).toBe("Minimal Item");
    expect(catalogRepository.create).toHaveBeenCalledWith({
      name: "Minimal Item",
      description: null,
      category: null,
      responsibleTeamId: null,
      defaultSlaHours: null,
      formSchema: null,
      approvalFlow: "none",
      approverRoleIds: [],
    });
  });

  it("creates with approvalFlow and approverRoleIds", async () => {
    const useCase = new CreateCatalogItemUseCase(catalogRepository);
    const dto = {
      name: "Approval Item",
      approvalFlow: "single" as const,
      approverRoleIds: ["manager", "admin"],
    };

    await useCase.execute(dto);

    expect(catalogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalFlow: "single",
        approverRoleIds: ["manager", "admin"],
      })
    );
  });
});
