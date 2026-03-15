import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListIncidentsUseCase } from "./list-incidents.use-case";
import { InvalidStatusFilterError } from "../errors";
import type { IIncidentRepository } from "../ports/incident-repository.port";

describe("ListIncidentsUseCase", () => {
  let incidentRepository: IIncidentRepository;

  beforeEach(() => {
    incidentRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdWithComments: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn(),
      assign: vi.fn(),
      addComment: vi.fn(),
    };
  });

  it("calls repository with filters", async () => {
    const useCase = new ListIncidentsUseCase(incidentRepository);
    await useCase.execute({
      requesterId: "u1",
      status: "Open",
      assignedToId: "u2",
    });

    expect(incidentRepository.list).toHaveBeenCalledWith({
      requesterId: "u1",
      status: "Open",
      assignedToId: "u2",
    });
  });

  it("throws InvalidStatusFilterError for invalid status", async () => {
    const useCase = new ListIncidentsUseCase(incidentRepository);

    await expect(useCase.execute({ status: "InvalidStatus" })).rejects.toThrow(InvalidStatusFilterError);
    await expect(useCase.execute({ status: "InvalidStatus" })).rejects.toThrow("Invalid status filter: InvalidStatus");
    expect(incidentRepository.list).not.toHaveBeenCalled();
  });

  it("passes valid status to repository", async () => {
    const useCase = new ListIncidentsUseCase(incidentRepository);
    await useCase.execute({ status: "InProgress" });

    expect(incidentRepository.list).toHaveBeenCalledWith({ status: "InProgress" });
  });
});
