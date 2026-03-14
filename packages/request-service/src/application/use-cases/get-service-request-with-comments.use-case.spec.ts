import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetServiceRequestWithCommentsUseCase } from "./get-service-request-with-comments.use-case";
import { ServiceRequestNotFoundError } from "../errors";
import type { IServiceRequestRepository } from "../ports/service-request-repository.port";

describe("GetServiceRequestWithCommentsUseCase", () => {
  let requestRepository: IServiceRequestRepository;

  const requestId = "11111111-1111-1111-1111-111111111111";
  const mockRequest = {
    id: requestId,
    catalogItemId: "catalog-id",
    requesterId: "user-id",
    status: "Submitted" as const,
    formData: null,
    assignedTeamId: null,
    assignedToId: null,
    submittedAt: new Date("2025-01-15T10:00:00Z"),
    completedAt: null,
    createdAt: new Date("2025-01-14T09:00:00Z"),
    updatedAt: new Date("2025-01-15T10:00:00Z"),
  };

  const mockComments = [
    {
      id: "comment-1",
      requestId,
      authorId: "user-2",
      body: "First comment",
      createdAt: new Date("2025-01-14T12:00:00Z"),
    },
  ];

  beforeEach(() => {
    requestRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockRequest),
      list: vi.fn(),
      updateStatus: vi.fn(),
      addComment: vi.fn(),
      getComments: vi.fn().mockResolvedValue(mockComments),
    };
  });

  it("returns request with comments and ISO date strings", async () => {
    const useCase = new GetServiceRequestWithCommentsUseCase(requestRepository);

    const result = await useCase.execute(requestId);

    expect(result.id).toBe(requestId);
    expect(result.catalogItemId).toBe("catalog-id");
    expect(result.requesterId).toBe("user-id");
    expect(result.status).toBe("Submitted");
    expect(result.submittedAt).toBe("2025-01-15T10:00:00.000Z");
    expect(result.createdAt).toBe("2025-01-14T09:00:00.000Z");
    expect(result.updatedAt).toBe("2025-01-15T10:00:00.000Z");
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]).toMatchObject({
      id: "comment-1",
      requestId,
      authorId: "user-2",
      body: "First comment",
      createdAt: "2025-01-14T12:00:00.000Z",
    });
  });

  it("returns request with empty comments array when no comments", async () => {
    vi.mocked(requestRepository.getComments).mockResolvedValue([]);
    const useCase = new GetServiceRequestWithCommentsUseCase(requestRepository);

    const result = await useCase.execute(requestId);

    expect(result.comments).toEqual([]);
  });

  it("returns null for submittedAt when request has no submittedAt", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue({
      ...mockRequest,
      submittedAt: null,
      completedAt: null,
    });
    const useCase = new GetServiceRequestWithCommentsUseCase(requestRepository);

    const result = await useCase.execute(requestId);

    expect(result.submittedAt).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  it("throws ServiceRequestNotFoundError when request does not exist", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(null);
    const useCase = new GetServiceRequestWithCommentsUseCase(requestRepository);

    await expect(useCase.execute(requestId)).rejects.toThrow(ServiceRequestNotFoundError);
    expect(requestRepository.getComments).not.toHaveBeenCalled();
  });
});
