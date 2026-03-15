import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChangeIncidentStatusUseCase } from "./change-incident-status.use-case";
import { IncidentNotFoundError, InvalidStatusTransitionError } from "../errors";
import type { IIncidentRepository } from "../ports/incident-repository.port";
import type { Incident } from "../../domain/entities/incident.entity";

describe("ChangeIncidentStatusUseCase", () => {
  let incidentRepository: IIncidentRepository;
  const incidentId = "11111111-1111-1111-1111-111111111111";
  const mockIncident: Incident = {
    id: incidentId,
    title: "Test",
    description: "Desc",
    status: "Open",
    criticality: "Medium",
    serviceAffected: null,
    requesterId: "u1",
    assignedTeamId: null,
    assignedToId: null,
    problemId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
  };

  beforeEach(() => {
    incidentRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockIncident),
      findByIdWithComments: vi.fn(),
      list: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue({ ...mockIncident, status: "InAnalysis" }),
      assign: vi.fn(),
      addComment: vi.fn(),
    };
  });

  it("updates status successfully when transition is allowed", async () => {
    const useCase = new ChangeIncidentStatusUseCase(incidentRepository);
    const result = await useCase.execute(incidentId, "InAnalysis", "u1", "Starting analysis");

    expect(result.status).toBe("InAnalysis");
    expect(incidentRepository.updateStatus).toHaveBeenCalledWith(
      incidentId,
      "InAnalysis",
      "u1",
      "Starting analysis",
      true
    );
  });

  it("throws IncidentNotFoundError when incident does not exist", async () => {
    vi.mocked(incidentRepository.findById).mockResolvedValue(null);
    const useCase = new ChangeIncidentStatusUseCase(incidentRepository);

    await expect(useCase.execute(incidentId, "InProgress", null, null)).rejects.toThrow(IncidentNotFoundError);
    expect(incidentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("throws InvalidStatusTransitionError when transition not allowed", async () => {
    const useCase = new ChangeIncidentStatusUseCase(incidentRepository);
    // Open -> Completed is not in ALLOWED_TRANSITIONS for Open
    await expect(useCase.execute(incidentId, "Completed", "u1", null)).rejects.toThrow(InvalidStatusTransitionError);
    expect(incidentRepository.updateStatus).not.toHaveBeenCalled();
  });
});
