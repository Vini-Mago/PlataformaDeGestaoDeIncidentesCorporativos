import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssignIncidentUseCase } from "./assign-incident.use-case";
import { IncidentNotFoundError } from "../errors";
import type { IIncidentRepository } from "../ports/incident-repository.port";
import type { Incident } from "../../domain/entities/incident.entity";

describe("AssignIncidentUseCase", () => {
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
      updateStatus: vi.fn(),
      assign: vi.fn().mockResolvedValue({ ...mockIncident, assignedToId: "u2" }),
      addComment: vi.fn(),
    };
  });

  it("assigns incident to user", async () => {
    const useCase = new AssignIncidentUseCase(incidentRepository);
    const result = await useCase.execute(incidentId, null, "u2");

    expect(result.assignedToId).toBe("u2");
    expect(incidentRepository.assign).toHaveBeenCalledWith(incidentId, null, "u2", true);
  });

  it("keeps existing assignment when only one field passed", async () => {
    const withAssignment = { ...mockIncident, assignedTeamId: "team1", assignedToId: "u1" };
    vi.mocked(incidentRepository.findById).mockResolvedValue(withAssignment);
    vi.mocked(incidentRepository.assign).mockResolvedValue({ ...withAssignment, assignedToId: "u2" });
    const useCase = new AssignIncidentUseCase(incidentRepository);

    await useCase.execute(incidentId, null, "u2");

    expect(incidentRepository.assign).toHaveBeenCalledWith(incidentId, "team1", "u2", true);
  });

  it("throws IncidentNotFoundError when incident does not exist", async () => {
    vi.mocked(incidentRepository.findById).mockResolvedValue(null);
    const useCase = new AssignIncidentUseCase(incidentRepository);

    await expect(useCase.execute(incidentId, null, "u2")).rejects.toThrow(IncidentNotFoundError);
    expect(incidentRepository.assign).not.toHaveBeenCalled();
  });
});
