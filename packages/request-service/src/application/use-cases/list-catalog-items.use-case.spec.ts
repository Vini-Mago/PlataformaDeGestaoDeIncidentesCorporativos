import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListCatalogItemsUseCase } from "./list-catalog-items.use-case";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";

describe("ListCatalogItemsUseCase", () => {
  let catalogRepository: IServiceCatalogRepository;

  const mockItems = [
    {
      id: "item-1",
      name: "Access Request",
      description: null,
      category: "IT",
      responsibleTeamId: null,
      defaultSlaHours: null,
      formSchema: null,
      approvalFlow: "none" as const,
      approverRoleIds: [] as string[],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    catalogRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      listActive: vi.fn().mockResolvedValue(mockItems),
    };
  });

  it("returns list of active catalog items", async () => {
    const useCase = new ListCatalogItemsUseCase(catalogRepository);

    const result = await useCase.execute();

    expect(result).toEqual(mockItems);
    expect(catalogRepository.listActive).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when no items exist", async () => {
    vi.mocked(catalogRepository.listActive).mockResolvedValue([]);
    const useCase = new ListCatalogItemsUseCase(catalogRepository);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
