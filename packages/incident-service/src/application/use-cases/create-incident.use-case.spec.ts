import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateIncidentUseCase } from "./create-incident.use-case";
import type { IIncidentRepository } from "../ports/incident-repository.port";
import type { Incident } from "../../domain/entities/incident.entity";

describe("CreateIncidentUseCase", () => {
  let incidentRepository: IIncidentRepository;
  const requesterId = "11111111-1111-1111-1111-111111111111";

  const mockIncident: Incident = {
    id: "22222222-2222-2222-2222-222222222222",
    title: "Server down",
    description: "Production server not responding",
    status: "Open",
    criticality: "High",
    serviceAffected: "api-gateway",
    requesterId,
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
      create: vi.fn().mockResolvedValue(mockIncident),
      findById: vi.fn(),
      findByIdWithComments: vi.fn(),
      list: vi.fn(),
      updateStatus: vi.fn(),
      assign: vi.fn(),
      addComment: vi.fn(),
    };
  });

  it("creates incident successfully", async () => {
    const useCase = new CreateIncidentUseCase(incidentRepository);
    const dto = {
      title: "Server down",
      description: "Production server not responding",
      criticality: "High" as const,
      serviceAffected: "api-gateway",
    };

    const result = await useCase.execute(dto, requesterId);

    expect(result).toEqual(mockIncident);
    expect(incidentRepository.create).toHaveBeenCalledWith({
      title: dto.title,
      description: dto.description,
      criticality: dto.criticality,
      serviceAffected: dto.serviceAffected,
      requesterId,
      assignedTeamId: null,
      assignedToId: null,
      publishCreatedEvent: true,
    });
  });

  it("creates incident with null serviceAffected when omitted", async () => {
    const useCase = new CreateIncidentUseCase(incidentRepository);
    const dto = {
      title: "Bug",
      description: "UI bug",
      criticality: "Low" as const,
    };

    await useCase.execute(dto, requesterId);

    expect(incidentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceAffected: null,
      })
    );
  });
});
