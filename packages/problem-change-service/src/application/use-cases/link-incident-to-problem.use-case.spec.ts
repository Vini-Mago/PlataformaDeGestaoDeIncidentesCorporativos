import { describe, it, expect, vi, beforeEach } from "vitest";
import { LinkIncidentToProblemUseCase } from "./link-incident-to-problem.use-case";
import { ProblemNotFoundError } from "../errors";
import type { IProblemRepository } from "../ports/problem-repository.port";
import type { Problem } from "../../domain/entities/problem.entity";

describe("LinkIncidentToProblemUseCase", () => {
  let problemRepository: IProblemRepository;
  const problemId = "11111111-1111-1111-1111-111111111111";
  const incidentId = "33333333-3333-3333-3333-333333333333";

  const mockProblem: Problem = {
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
      findById: vi.fn().mockResolvedValue(mockProblem),
      list: vi.fn(),
      getLinkedIncidentIds: vi.fn(),
      listLinksForIncidents: vi.fn(),
      update: vi.fn(),
      linkIncident: vi.fn().mockResolvedValue(undefined),
      unlinkIncident: vi.fn(),
    };
  });

  it("links when problem exists", async () => {
    const useCase = new LinkIncidentToProblemUseCase(problemRepository);
    await useCase.execute(problemId, incidentId);

    expect(problemRepository.findById).toHaveBeenCalledWith(problemId);
    expect(problemRepository.linkIncident).toHaveBeenCalledWith(problemId, incidentId);
  });

  it("throws ProblemNotFoundError when problem missing", async () => {
    vi.mocked(problemRepository.findById).mockResolvedValue(null);
    const useCase = new LinkIncidentToProblemUseCase(problemRepository);

    await expect(useCase.execute(problemId, incidentId)).rejects.toThrow(ProblemNotFoundError);
    expect(problemRepository.linkIncident).not.toHaveBeenCalled();
  });
});
