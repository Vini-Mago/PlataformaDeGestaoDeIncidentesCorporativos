import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetIncidentUseCase } from "./get-incident.use-case";
import { IncidentNotFoundError } from "../errors";
import type { IIncidentRepository } from "../ports/incident-repository.port";

describe("GetIncidentUseCase", () => {
  let incidentRepository: IIncidentRepository;
  const incidentId = "11111111-1111-1111-1111-111111111111";
  const mockIncident = {
    id: incidentId,
    title: "Test",
    description: "Desc",
    status: "Open",
    criticality: "Medium",
    comments: [{ id: "c1", authorId: "u1", body: "Comment", createdAt: new Date() }],
  };

  beforeEach(() => {
    incidentRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdWithComments: vi.fn().mockResolvedValue(mockIncident),
      list: vi.fn(),
      updateStatus: vi.fn(),
      assign: vi.fn(),
      addComment: vi.fn(),
    };
  });

  it("returns incident when found", async () => {
    const useCase = new GetIncidentUseCase(incidentRepository);
    const result = await useCase.execute(incidentId);

    expect(result).toEqual(mockIncident);
    expect(incidentRepository.findByIdWithComments).toHaveBeenCalledWith(incidentId);
  });

  it("throws IncidentNotFoundError when not found", async () => {
    vi.mocked(incidentRepository.findByIdWithComments).mockResolvedValue(null);
    const useCase = new GetIncidentUseCase(incidentRepository);

    await expect(useCase.execute(incidentId)).rejects.toThrow(IncidentNotFoundError);
    await expect(useCase.execute(incidentId)).rejects.toThrow(`Incident not found: ${incidentId}`);
  });
});
