import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateProblemUseCase } from "./update-problem.use-case";
import { ProblemNotFoundError, InvalidProblemStatusTransitionError } from "../errors";
import type { IProblemRepository } from "../ports/problem-repository.port";
import type { Problem } from "../../domain/entities/problem.entity";

describe("UpdateProblemUseCase", () => {
  let problemRepository: IProblemRepository;
  const problemId = "11111111-1111-1111-1111-111111111111";

  const baseProblem: Problem = {
    id: problemId,
    title: "P",
    description: "D",
    status: "Open",
    rootCause: null,
    actionPlan: null,
    createdById: "22222222-2222-2222-2222-222222222222",
    createdAt: new Date(),
    updatedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
  };

  beforeEach(() => {
    problemRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(baseProblem),
      update: vi.fn().mockImplementation((_id, _p) => Promise.resolve({ ...baseProblem, rootCause: "x" })),
      list: vi.fn(),
      getLinkedIncidentIds: vi.fn().mockResolvedValue([]),
      listLinksForIncidents: vi.fn(),
      linkIncident: vi.fn(),
      unlinkIncident: vi.fn(),
    };
  });

  it("updates rootCause and returns detail", async () => {
    const useCase = new UpdateProblemUseCase(problemRepository);
    const result = await useCase.execute(problemId, { rootCause: "Firewall mal configurado" });

    expect(problemRepository.update).toHaveBeenCalledWith(problemId, {
      rootCause: "Firewall mal configurado",
      status: undefined,
      actionPlan: undefined,
      changedById: undefined,
    });
    expect(result.linkedIncidentIds).toEqual([]);
    expect(result.rootCause).toBe("x");
  });

  it("throws when transition invalid", async () => {
    vi.mocked(problemRepository.findById).mockResolvedValue({
      ...baseProblem,
      status: "Closed",
    });
    const useCase = new UpdateProblemUseCase(problemRepository);

    await expect(useCase.execute(problemId, { status: "Resolved" })).rejects.toThrow(
      InvalidProblemStatusTransitionError
    );
    expect(problemRepository.update).not.toHaveBeenCalled();
  });

  it("throws ProblemNotFoundError when missing", async () => {
    vi.mocked(problemRepository.findById).mockResolvedValue(null);
    const useCase = new UpdateProblemUseCase(problemRepository);

    await expect(useCase.execute(problemId, { rootCause: "a" })).rejects.toThrow(ProblemNotFoundError);
  });
});
