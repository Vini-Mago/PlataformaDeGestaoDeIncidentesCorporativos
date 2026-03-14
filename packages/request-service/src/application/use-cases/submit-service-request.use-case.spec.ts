import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubmitServiceRequestUseCase } from "./submit-service-request.use-case";
import { ServiceRequestNotFoundError, InvalidStatusTransitionError } from "../errors";
import type { IServiceRequestRepository } from "../ports/service-request-repository.port";

describe("SubmitServiceRequestUseCase", () => {
  let requestRepository: IServiceRequestRepository;

  const requestId = "11111111-1111-1111-1111-111111111111";
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
      findById: vi.fn().mockResolvedValue(draftRequest),
      list: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(submittedRequest),
      addComment: vi.fn(),
      getComments: vi.fn(),
    };
  });

  it("submits a Draft request successfully", async () => {
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    const result = await useCase.execute(requestId);

    expect(result).toEqual(submittedRequest);
    expect(requestRepository.findById).toHaveBeenCalledWith(requestId);
    expect(requestRepository.updateStatus).toHaveBeenCalledWith(
      requestId,
      "Submitted",
      expect.objectContaining({ submittedAt: expect.any(Date) })
    );
  });

  it("throws ServiceRequestNotFoundError when request does not exist", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(null);
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId)).rejects.toThrow(ServiceRequestNotFoundError);
    await expect(useCase.execute(requestId)).rejects.toThrow(`Service request not found: ${requestId}`);
    expect(requestRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("throws InvalidStatusTransitionError when request is already Submitted", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue({
      ...draftRequest,
      status: "Submitted",
    });
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId)).rejects.toThrow(InvalidStatusTransitionError);
    await expect(useCase.execute(requestId)).rejects.toThrow(
      "Invalid status transition from Submitted to Submitted"
    );
    expect(requestRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("throws InvalidStatusTransitionError when request is InProgress", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue({
      ...draftRequest,
      status: "InProgress",
    });
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId)).rejects.toThrow(InvalidStatusTransitionError);
    expect(requestRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("throws InvalidStatusTransitionError when request is Completed", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue({
      ...draftRequest,
      status: "Completed",
    });
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId)).rejects.toThrow(InvalidStatusTransitionError);
    expect(requestRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("throws InvalidStatusTransitionError when request is Cancelled", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue({
      ...draftRequest,
      status: "Cancelled",
    });
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId)).rejects.toThrow(InvalidStatusTransitionError);
    expect(requestRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("handles unusual requestId (empty string) — repository returns null, throws not found", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(null);
    const useCase = new SubmitServiceRequestUseCase(requestRepository);

    await expect(useCase.execute("")).rejects.toThrow(ServiceRequestNotFoundError);
  });
});
