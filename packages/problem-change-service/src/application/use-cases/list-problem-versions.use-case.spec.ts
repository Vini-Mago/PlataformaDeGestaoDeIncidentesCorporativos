import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListProblemVersionsUseCase } from "./list-problem-versions.use-case";
import type { IProblemRepository } from "../ports/problem-repository.port";
import type { IVersionHistoryRepository } from "../ports/version-history.port";
import { ProblemNotFoundError } from "../errors";

describe("ListProblemVersionsUseCase", () => {
  let problemRepository: IProblemRepository;
  let versionHistoryRepository: IVersionHistoryRepository;
  const problemId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    problemRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      getLinkedIncidentIds: vi.fn(),
      listLinksForIncidents: vi.fn(),
      linkIncident: vi.fn(),
      unlinkIncident: vi.fn(),
    };
    versionHistoryRepository = {
      listProblemVersions: vi.fn(),
      listChangeVersions: vi.fn(),
    };
  });

  it("retorna versões quando problema existe", async () => {
    vi.mocked(problemRepository.findById).mockResolvedValue({
      id: problemId,
      title: "p",
      description: "d",
      status: "Open",
      rootCause: null,
      actionPlan: null,
      createdById: "u",
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
      closedAt: null,
    });
    vi.mocked(versionHistoryRepository.listProblemVersions).mockResolvedValue([
      { id: "v1", versionNumber: 1, changedById: "u", snapshot: {}, createdAt: new Date() },
    ]);

    const uc = new ListProblemVersionsUseCase(problemRepository, versionHistoryRepository);
    const items = await uc.execute(problemId, 10);
    expect(items).toHaveLength(1);
    expect(versionHistoryRepository.listProblemVersions).toHaveBeenCalledWith(problemId, 10);
  });

  it("lança ProblemNotFoundError quando não existe", async () => {
    vi.mocked(problemRepository.findById).mockResolvedValue(null);
    const uc = new ListProblemVersionsUseCase(problemRepository, versionHistoryRepository);
    await expect(uc.execute(problemId, 10)).rejects.toThrow(ProblemNotFoundError);
  });
});
