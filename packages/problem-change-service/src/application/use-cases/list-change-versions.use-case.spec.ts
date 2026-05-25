import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListChangeVersionsUseCase } from "./list-change-versions.use-case";
import type { IChangeRepository } from "../ports/change-repository.port";
import type { IVersionHistoryRepository } from "../ports/version-history.port";
import { ChangeNotFoundError } from "../errors";

describe("ListChangeVersionsUseCase", () => {
  let changeRepository: IChangeRepository;
  let versionHistoryRepository: IVersionHistoryRepository;
  const changeId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    changeRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      getLinkedIncidentIds: vi.fn(),
      getLinkedProblemIds: vi.fn(),
      linkIncident: vi.fn(),
      unlinkIncident: vi.fn(),
      linkProblem: vi.fn(),
      unlinkProblem: vi.fn(),
    };
    versionHistoryRepository = {
      listProblemVersions: vi.fn(),
      listChangeVersions: vi.fn(),
    };
  });

  it("retorna versões quando mudança existe", async () => {
    vi.mocked(changeRepository.findById).mockResolvedValue({
      id: changeId,
      title: "c",
      description: "d",
      justification: "j",
      changeType: "Normal",
      risk: "Low",
      status: "Draft",
      windowStart: null,
      windowEnd: null,
      rollbackPlan: null,
      createdById: "u",
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    });
    vi.mocked(versionHistoryRepository.listChangeVersions).mockResolvedValue([
      { id: "v1", versionNumber: 1, changedById: "u", snapshot: {}, createdAt: new Date() },
    ]);

    const uc = new ListChangeVersionsUseCase(changeRepository, versionHistoryRepository);
    const items = await uc.execute(changeId, 10);
    expect(items).toHaveLength(1);
    expect(versionHistoryRepository.listChangeVersions).toHaveBeenCalledWith(changeId, 10);
  });

  it("lança ChangeNotFoundError quando não existe", async () => {
    vi.mocked(changeRepository.findById).mockResolvedValue(null);
    const uc = new ListChangeVersionsUseCase(changeRepository, versionHistoryRepository);
    await expect(uc.execute(changeId, 10)).rejects.toThrow(ChangeNotFoundError);
  });
});
