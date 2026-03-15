import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateProblemUseCase } from "./create-problem.use-case";
import type { IProblemRepository } from "../ports/problem-repository.port";
import type { Problem } from "../../domain/entities/problem.entity";

describe("CreateProblemUseCase", () => {
  let problemRepository: IProblemRepository;
  const createdById = "11111111-1111-1111-1111-111111111111";

  const mockProblem: Problem = {
    id: "22222222-2222-2222-2222-222222222222",
    title: "Recurring outage",
    description: "Server goes down every Friday",
    status: "Open",
    rootCause: null,
    actionPlan: null,
    createdById,
    createdAt: new Date(),
    updatedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
  };

  beforeEach(() => {
    problemRepository = {
      create: vi.fn().mockResolvedValue(mockProblem),
      findById: vi.fn(),
      list: vi.fn(),
    };
  });

  it("creates problem successfully", async () => {
    const useCase = new CreateProblemUseCase(problemRepository);
    const dto = {
      title: "Recurring outage",
      description: "Server goes down every Friday",
    };

    const result = await useCase.execute(dto, createdById);

    expect(result).toEqual(mockProblem);
    expect(problemRepository.create).toHaveBeenCalledWith({
      title: dto.title,
      description: dto.description,
      rootCause: null,
      actionPlan: null,
      createdById,
      publishCreatedEvent: true,
    });
  });

  it("creates problem with rootCause and actionPlan when provided", async () => {
    const useCase = new CreateProblemUseCase(problemRepository);
    const dto = {
      title: "Bug",
      description: "UI bug",
      rootCause: "Memory leak in component",
      actionPlan: "Fix and deploy patch",
    };

    await useCase.execute(dto, createdById);

    expect(problemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        rootCause: "Memory leak in component",
        actionPlan: "Fix and deploy patch",
      })
    );
  });
});
