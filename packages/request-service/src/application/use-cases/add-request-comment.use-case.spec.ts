import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddRequestCommentUseCase } from "./add-request-comment.use-case";
import { ServiceRequestNotFoundError } from "../errors";
import type { IServiceRequestRepository } from "../ports/service-request-repository.port";

describe("AddRequestCommentUseCase", () => {
  let requestRepository: IServiceRequestRepository;

  const requestId = "11111111-1111-1111-1111-111111111111";
  const authorId = "22222222-2222-2222-2222-222222222222";
  const mockRequest = {
    id: requestId,
    catalogItemId: "catalog-id",
    requesterId: "user-id",
    status: "Draft" as const,
    formData: null,
    assignedTeamId: null,
    assignedToId: null,
    submittedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockComment = {
    id: "comment-1",
    requestId,
    authorId,
    body: "This is a comment",
    createdAt: new Date(),
  };

  beforeEach(() => {
    requestRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockRequest),
      list: vi.fn(),
      updateStatus: vi.fn(),
      addComment: vi.fn().mockResolvedValue(mockComment),
      getComments: vi.fn(),
    };
  });

  it("adds a comment successfully", async () => {
    const useCase = new AddRequestCommentUseCase(requestRepository);
    const dto = { body: "This is a comment" };

    const result = await useCase.execute(requestId, authorId, dto);

    expect(result).toEqual(mockComment);
    expect(requestRepository.findById).toHaveBeenCalledWith(requestId);
    expect(requestRepository.addComment).toHaveBeenCalledWith(requestId, authorId, "This is a comment");
  });

  it("throws ServiceRequestNotFoundError when request does not exist", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(null);
    const useCase = new AddRequestCommentUseCase(requestRepository);
    const dto = { body: "Comment" };

    await expect(useCase.execute(requestId, authorId, dto)).rejects.toThrow(
      ServiceRequestNotFoundError
    );
    await expect(useCase.execute(requestId, authorId, dto)).rejects.toThrow(
      `Service request not found: ${requestId}`
    );
    expect(requestRepository.addComment).not.toHaveBeenCalled();
  });

  it("handles minimal body (single character, unusual)", async () => {
    const useCase = new AddRequestCommentUseCase(requestRepository);
    const dto = { body: "x" };
    vi.mocked(requestRepository.addComment).mockResolvedValue({
      ...mockComment,
      body: "x",
    });

    const result = await useCase.execute(requestId, authorId, dto);

    expect(result.body).toBe("x");
    expect(requestRepository.addComment).toHaveBeenCalledWith(requestId, authorId, "x");
  });
});
