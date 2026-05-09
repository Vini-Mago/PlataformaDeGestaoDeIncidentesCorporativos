import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateChangeUseCase } from "./update-change.use-case";
import type { IChangeRepository } from "../ports/change-repository.port";
import type { Change } from "../../domain/entities/change.entity";
import { InvalidChangeStatusTransitionError, ChangeExecutionOutsideWindowError } from "../errors";

describe("UpdateChangeUseCase", () => {
  let repository: IChangeRepository;
  const id = "11111111-1111-1111-1111-111111111111";
  const base: Change = {
    id,
    title: "T",
    description: "D",
    justification: "J",
    changeType: "Normal",
    risk: "High",
    status: "Submitted",
    windowStart: null,
    windowEnd: null,
    rollbackPlan: null,
    createdById: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      getLinkedIncidentIds: vi.fn().mockResolvedValue([]),
      getLinkedProblemIds: vi.fn().mockResolvedValue([]),
      linkIncident: vi.fn(),
      unlinkIncident: vi.fn(),
      linkProblem: vi.fn(),
      unlinkProblem: vi.fn(),
    };
  });

  it("rejects Submitted -> Approved for High risk when CAB policy on", async () => {
    vi.mocked(repository.findById).mockResolvedValue(base);
    const uc = new UpdateChangeUseCase(repository, { cabHighRiskPolicy: true });

    await expect(uc.execute(id, { status: "Approved" })).rejects.toThrow(InvalidChangeStatusTransitionError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("transitions to InProgress only inside window", async () => {
    const start = new Date("2026-06-01T10:00:00.000Z");
    const end = new Date("2026-06-01T18:00:00.000Z");
    const now = new Date("2026-06-01T12:00:00.000Z");
    vi.mocked(repository.findById).mockResolvedValue({
      ...base,
      risk: "Low",
      status: "Scheduled",
      windowStart: start,
      windowEnd: end,
    });
    vi.mocked(repository.update).mockResolvedValue({
      ...base,
      status: "InProgress",
      windowStart: start,
      windowEnd: end,
    });

    const uc = new UpdateChangeUseCase(repository, { cabHighRiskPolicy: true, clock: () => now });
    const result = await uc.execute(id, { status: "InProgress" });
    expect(result.status).toBe("InProgress");
    expect(repository.update).toHaveBeenCalled();
  });

  it("rejects InProgress when now outside window", async () => {
    const start = new Date("2026-06-01T10:00:00.000Z");
    const end = new Date("2026-06-01T18:00:00.000Z");
    const now = new Date("2026-06-02T12:00:00.000Z");
    vi.mocked(repository.findById).mockResolvedValue({
      ...base,
      risk: "Low",
      status: "Scheduled",
      windowStart: start,
      windowEnd: end,
    });

    const uc = new UpdateChangeUseCase(repository, { cabHighRiskPolicy: true, clock: () => now });
    await expect(uc.execute(id, { status: "InProgress" })).rejects.toThrow(ChangeExecutionOutsideWindowError);
  });
});
