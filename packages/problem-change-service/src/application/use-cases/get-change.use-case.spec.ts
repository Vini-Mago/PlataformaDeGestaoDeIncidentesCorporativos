import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetChangeUseCase } from "./get-change.use-case";
import { ChangeNotFoundError } from "../errors";
import type { IChangeRepository } from "../ports/change-repository.port";
import type { Change } from "../../domain/entities/change.entity";

describe("GetChangeUseCase", () => {
  let changeRepository: IChangeRepository;
  const changeId = "11111111-1111-1111-1111-111111111111";
  const mockChange: Change = {
    id: changeId,
    title: "Test Change",
    description: "Desc",
    justification: "J",
    changeType: "Normal",
    risk: "Low",
    status: "Draft",
    windowStart: null,
    windowEnd: null,
    rollbackPlan: null,
    createdById: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    completedAt: null,
  };

  beforeEach(() => {
    changeRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockChange),
      list: vi.fn(),
      update: vi.fn(),
      getLinkedIncidentIds: vi.fn().mockResolvedValue(["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"]),
      getLinkedProblemIds: vi.fn().mockResolvedValue(["cccccccc-cccc-cccc-cccc-cccccccccccc"]),
      linkIncident: vi.fn(),
      unlinkIncident: vi.fn(),
      linkProblem: vi.fn(),
      unlinkProblem: vi.fn(),
    };
  });

  it("returns change when found", async () => {
    const useCase = new GetChangeUseCase(changeRepository);
    const result = await useCase.execute(changeId);

    expect(result).toEqual({
      ...mockChange,
      linkedIncidentIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      linkedProblemIds: ["cccccccc-cccc-cccc-cccc-cccccccccccc"],
    });
    expect(changeRepository.findById).toHaveBeenCalledWith(changeId);
  });

  it("throws ChangeNotFoundError when not found", async () => {
    vi.mocked(changeRepository.findById).mockResolvedValue(null);
    const useCase = new GetChangeUseCase(changeRepository);

    await expect(useCase.execute(changeId)).rejects.toThrow(ChangeNotFoundError);
    await expect(useCase.execute(changeId)).rejects.toThrow(`Change not found: ${changeId}`);
  });
});
