import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetChangeUseCase } from "./get-change.use-case";
import { ChangeNotFoundError } from "../errors";
import type { IChangeRepository } from "../ports/change-repository.port";

describe("GetChangeUseCase", () => {
  let changeRepository: IChangeRepository;
  const changeId = "11111111-1111-1111-1111-111111111111";
  const mockChange = {
    id: changeId,
    title: "Test Change",
    description: "Desc",
    justification: "J",
    changeType: "Normal",
    risk: "Low",
    status: "Draft",
  };

  beforeEach(() => {
    changeRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockChange),
      list: vi.fn(),
    };
  });

  it("returns change when found", async () => {
    const useCase = new GetChangeUseCase(changeRepository);
    const result = await useCase.execute(changeId);

    expect(result).toEqual(mockChange);
    expect(changeRepository.findById).toHaveBeenCalledWith(changeId);
  });

  it("throws ChangeNotFoundError when not found", async () => {
    vi.mocked(changeRepository.findById).mockResolvedValue(null);
    const useCase = new GetChangeUseCase(changeRepository);

    await expect(useCase.execute(changeId)).rejects.toThrow(ChangeNotFoundError);
    await expect(useCase.execute(changeId)).rejects.toThrow(`Change not found: ${changeId}`);
  });
});
