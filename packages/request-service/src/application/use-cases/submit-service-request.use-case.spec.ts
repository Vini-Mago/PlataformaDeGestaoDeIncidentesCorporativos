import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubmitServiceRequestUseCase } from "./submit-service-request.use-case";
import { ServiceRequestNotFoundError, InvalidStatusTransitionError } from "../errors";
import type { IServiceRequestRepository } from "../ports/service-request-repository.port";

describe("SubmitServiceRequestUseCase", () => {
  let requestRepository: IServiceRequestRepository;

  const requestId = "11111111-1111-1111-1111-111111111111";
  const actorId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const draftRequest = {
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

  const submittedRequest = {
    ...draftRequest,
    status: "Submitted" as const,
    submittedAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    requestRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      transition: vi.fn().mockResolvedValue(submittedRequest),
      getWorkflowEvents: vi.fn(),
      addComment: vi.fn(),
      getComments: vi.fn(),
    };
  });

  it("submits a Draft request successfully", async () => {
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    const result = await useCase.execute(requestId, actorId);

    expect(result).toEqual(submittedRequest);
    expect(requestRepository.transition).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({
        actorId,
        allowedFromStatuses: ["Draft"],
        toStatus: "Submitted",
        submittedAt: expect.any(Date),
      })
    );
  });

  it("throws ServiceRequestNotFoundError when request does not exist", async () => {
    vi.mocked(requestRepository.transition).mockRejectedValue(new ServiceRequestNotFoundError(requestId));
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId, actorId)).rejects.toThrow(ServiceRequestNotFoundError);
    await expect(useCase.execute(requestId, actorId)).rejects.toThrow(`Service request not found: ${requestId}`);
  });

  it("throws InvalidStatusTransitionError when request is already Submitted", async () => {
    vi.mocked(requestRepository.transition).mockRejectedValue(
      new InvalidStatusTransitionError("Submitted", "Submitted")
    );
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId, actorId)).rejects.toThrow(InvalidStatusTransitionError);
    await expect(useCase.execute(requestId, actorId)).rejects.toThrow(
      "Invalid status transition from Submitted to Submitted"
    );
  });

  it("throws InvalidStatusTransitionError when request is InProgress", async () => {
    vi.mocked(requestRepository.transition).mockRejectedValue(
      new InvalidStatusTransitionError("InProgress", "Submitted")
    );
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId, actorId)).rejects.toThrow(InvalidStatusTransitionError);
  });

  it("throws InvalidStatusTransitionError when request is Completed", async () => {
    vi.mocked(requestRepository.transition).mockRejectedValue(
      new InvalidStatusTransitionError("Completed", "Submitted")
    );
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId, actorId)).rejects.toThrow(InvalidStatusTransitionError);
  });

  it("throws InvalidStatusTransitionError when request is Cancelled", async () => {
    vi.mocked(requestRepository.transition).mockRejectedValue(
      new InvalidStatusTransitionError("Cancelled", "Submitted")
    );
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId, actorId)).rejects.toThrow(InvalidStatusTransitionError);
  });

  it("handles unusual requestId (empty string) — transition throws not found", async () => {
    vi.mocked(requestRepository.transition).mockRejectedValue(new ServiceRequestNotFoundError(""));
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute("", actorId)).rejects.toThrow(ServiceRequestNotFoundError);
  });
});
