import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListServiceRequestsUseCase } from "./list-service-requests.use-case";
import type { IServiceRequestRepository } from "../ports/service-request-repository.port";

describe("ListServiceRequestsUseCase", () => {
  let requestRepository: IServiceRequestRepository;

  const mockRequests = [
    {
      id: "req-1",
      catalogItemId: "cat-1",
      requesterId: "user-1",
      status: "Draft" as const,
      formData: null,
      assignedTeamId: null,
      assignedToId: null,
      submittedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    requestRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue(mockRequests),
      updateStatus: vi.fn(),
      addComment: vi.fn(),
      getComments: vi.fn(),
    };
  });

  it("returns list of requests with empty query (typical)", async () => {
    const useCase = new ListServiceRequestsUseCase(requestRepository);

    const result = await useCase.execute();

    expect(result).toEqual(mockRequests);
    expect(requestRepository.list).toHaveBeenCalledWith({});
  });

  it("filters by requesterId", async () => {
    const useCase = new ListServiceRequestsUseCase(requestRepository);

    await useCase.execute({ requesterId: "user-123" });

    expect(requestRepository.list).toHaveBeenCalledWith({
      requesterId: "user-123",
      status: undefined,
      catalogItemId: undefined,
    });
  });

  it("filters by status", async () => {
    const useCase = new ListServiceRequestsUseCase(requestRepository);

    await useCase.execute({ status: "Submitted" });

    expect(requestRepository.list).toHaveBeenCalledWith({
      requesterId: undefined,
      status: "Submitted",
      catalogItemId: undefined,
    });
  });

  it("filters by catalogItemId", async () => {
    const useCase = new ListServiceRequestsUseCase(requestRepository);

    await useCase.execute({ catalogItemId: "cat-456" });

    expect(requestRepository.list).toHaveBeenCalledWith({
      requesterId: undefined,
      status: undefined,
      catalogItemId: "cat-456",
    });
  });

  it("combines multiple filters", async () => {
    const useCase = new ListServiceRequestsUseCase(requestRepository);

    await useCase.execute({
      requesterId: "user-1",
      status: "Completed",
      catalogItemId: "cat-1",
    });

    expect(requestRepository.list).toHaveBeenCalledWith({
      requesterId: "user-1",
      status: "Completed",
      catalogItemId: "cat-1",
    });
  });

  it("returns empty array when no requests match (unusual)", async () => {
    vi.mocked(requestRepository.list).mockResolvedValue([]);
    const useCase = new ListServiceRequestsUseCase(requestRepository);

    const result = await useCase.execute({ requesterId: "nonexistent" });

    expect(result).toEqual([]);
  });
});
