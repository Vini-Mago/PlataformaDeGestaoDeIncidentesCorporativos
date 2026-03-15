import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetProblemUseCase } from "./get-problem.use-case";
import { ProblemNotFoundError } from "../errors";
import type { IProblemRepository } from "../ports/problem-repository.port";

describe("GetProblemUseCase", () => {
  let problemRepository: IProblemRepository;
  const problemId = "11111111-1111-1111-1111-111111111111";
  const mockProblem = {
    id: problemId,
    title: "Test Problem",
    description: "Desc",
    status: "Open",
    rootCause: null,
    actionPlan: null,
  };

  beforeEach(() => {
    problemRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockProblem),
      list: vi.fn(),
    };
  });

  it("returns problem when found", async () => {
    const useCase = new GetProblemUseCase(problemRepository);
    const result = await useCase.execute(problemId);

    expect(result).toEqual(mockProblem);
    expect(problemRepository.findById).toHaveBeenCalledWith(problemId);
  });

  it("throws ProblemNotFoundError when not found", async () => {
    vi.mocked(problemRepository.findById).mockResolvedValue(null);
    const useCase = new GetProblemUseCase(problemRepository);

    await expect(useCase.execute(problemId)).rejects.toThrow(ProblemNotFoundError);
    await expect(useCase.execute(problemId)).rejects.toThrow(`Problem not found: ${problemId}`);
  });
});
