import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddIncidentCommentUseCase } from "./add-incident-comment.use-case";
import { IncidentNotFoundError } from "../errors";
import type { IIncidentRepository } from "../ports/incident-repository.port";
import type { Incident } from "../../domain/entities/incident.entity";

describe("AddIncidentCommentUseCase", () => {
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
  const mockComment = { id: "c1", incidentId, authorId: "u1", body: "Comment", createdAt: new Date() };

  beforeEach(() => {
    incidentRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockIncident),
      findByIdWithComments: vi.fn(),
      list: vi.fn(),
      updateStatus: vi.fn(),
      assign: vi.fn(),
      addComment: vi.fn().mockResolvedValue(mockComment),
    };
  });

  it("adds comment successfully", async () => {
    const useCase = new AddIncidentCommentUseCase(incidentRepository);
    const result = await useCase.execute(incidentId, "u1", "My comment");

    expect(result).toEqual(mockComment);
    expect(incidentRepository.addComment).toHaveBeenCalledWith(incidentId, "u1", "My comment");
  });

  it("throws IncidentNotFoundError when incident does not exist", async () => {
    vi.mocked(incidentRepository.findById).mockResolvedValue(null);
    const useCase = new AddIncidentCommentUseCase(incidentRepository);

    await expect(useCase.execute(incidentId, "u1", "Comment")).rejects.toThrow(IncidentNotFoundError);
    expect(incidentRepository.addComment).not.toHaveBeenCalled();
  });
});
