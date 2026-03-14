import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetCatalogItemUseCase } from "./get-catalog-item.use-case";
import { CatalogItemNotFoundError } from "../errors";
import type { IServiceCatalogRepository } from "../ports/service-catalog-repository.port";

describe("GetCatalogItemUseCase", () => {
  let catalogRepository: IServiceCatalogRepository;

  const itemId = "11111111-1111-1111-1111-111111111111";
  const mockItem = {
    id: itemId,
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
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockItem),
      listActive: vi.fn(),
    };
  });

  it("returns catalog item when found", async () => {
    const useCase = new GetCatalogItemUseCase(catalogRepository);

    const result = await useCase.execute(itemId);

    expect(result).toEqual(mockItem);
    expect(catalogRepository.findById).toHaveBeenCalledWith(itemId);
  });

  it("throws CatalogItemNotFoundError when item does not exist", async () => {
    vi.mocked(catalogRepository.findById).mockResolvedValue(null);
    const useCase = new GetCatalogItemUseCase(catalogRepository);

    await expect(useCase.execute(itemId)).rejects.toThrow(CatalogItemNotFoundError);
    await expect(useCase.execute(itemId)).rejects.toThrow(`Catalog item not found: ${itemId}`);
  });

  it("handles unusual id (empty string)", async () => {
    vi.mocked(catalogRepository.findById).mockResolvedValue(null);
    const useCase = new GetCatalogItemUseCase(catalogRepository);

    await expect(useCase.execute("")).rejects.toThrow(CatalogItemNotFoundError);
    expect(catalogRepository.findById).toHaveBeenCalledWith("");
  });
});
