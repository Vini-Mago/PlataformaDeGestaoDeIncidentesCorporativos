import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateChangeUseCase } from "./create-change.use-case";
import type { IChangeRepository } from "../ports/change-repository.port";
import type { Change } from "../../domain/entities/change.entity";

describe("CreateChangeUseCase", () => {
  let changeRepository: IChangeRepository;
  const createdById = "11111111-1111-1111-1111-111111111111";

  const mockChange: Change = {
    id: "22222222-2222-2222-2222-222222222222",
    title: "Deploy v2",
    description: "New feature release",
    justification: "Business requirement",
    changeType: "Normal",
    risk: "Medium",
    status: "Draft",
    windowStart: null,
    windowEnd: null,
    rollbackPlan: null,
    createdById,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  beforeEach(() => {
    changeRepository = {
      create: vi.fn().mockResolvedValue(mockChange),
      findById: vi.fn(),
      list: vi.fn(),
    };
  });

  it("creates change successfully", async () => {
    const useCase = new CreateChangeUseCase(changeRepository);
    const dto = {
      title: "Deploy v2",
      description: "New feature release",
      justification: "Business requirement",
      changeType: "Normal" as const,
      risk: "Medium" as const,
    };

    const result = await useCase.execute(dto, createdById);

    expect(result).toEqual(mockChange);
    expect(changeRepository.create).toHaveBeenCalledWith({
      title: dto.title,
      description: dto.description,
      justification: dto.justification,
      changeType: dto.changeType,
      risk: dto.risk,
      windowStart: null,
      windowEnd: null,
      rollbackPlan: null,
      createdById,
      publishCreatedEvent: true,
    });
  });

  it("creates change with window and rollbackPlan when provided", async () => {
    const useCase = new CreateChangeUseCase(changeRepository);
    const dto = {
      title: "Emergency fix",
      description: "Critical patch",
      justification: "Security",
      changeType: "Emergency" as const,
      risk: "High" as const,
      windowStart: "2025-03-15T10:00:00.000Z",
      windowEnd: "2025-03-15T12:00:00.000Z",
      rollbackPlan: "Revert commit",
    };

    await useCase.execute(dto, createdById);

    expect(changeRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        windowStart: new Date("2025-03-15T10:00:00.000Z"),
        windowEnd: new Date("2025-03-15T12:00:00.000Z"),
        rollbackPlan: "Revert commit",
      })
    );
  });
});
