import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetServiceRequestUseCase } from "./get-service-request.use-case";
import { ServiceRequestNotFoundError } from "../errors";
import type { IServiceRequestRepository } from "../ports/service-request-repository.port";

describe("GetServiceRequestUseCase", () => {
  let requestRepository: IServiceRequestRepository;

  const requestId = "11111111-1111-1111-1111-111111111111";
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

  beforeEach(() => {
    requestRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockRequest),
      list: vi.fn(),
      updateStatus: vi.fn(),
      addComment: vi.fn(),
      getComments: vi.fn(),
    };
  });

  it("returns request when found", async () => {
    const useCase = new GetServiceRequestUseCase(requestRepository);

    const result = await useCase.execute(requestId);

    expect(result).toEqual(mockRequest);
    expect(requestRepository.findById).toHaveBeenCalledWith(requestId);
  });

  it("throws ServiceRequestNotFoundError when request does not exist", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(null);
    const useCase = new GetServiceRequestUseCase(requestRepository);

    await expect(useCase.execute(requestId)).rejects.toThrow(ServiceRequestNotFoundError);
    await expect(useCase.execute(requestId)).rejects.toThrow(`Service request not found: ${requestId}`);
  });

  it("handles empty string id (unusual — passes through, throws not found)", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(null);
    const useCase = new GetServiceRequestUseCase(requestRepository);

    await expect(useCase.execute("")).rejects.toThrow(ServiceRequestNotFoundError);
    expect(requestRepository.findById).toHaveBeenCalledWith("");
  });

  it("handles non-UUID id (unusual — passes through, throws not found)", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue(null);
    const useCase = new GetServiceRequestUseCase(requestRepository);

    await expect(useCase.execute("../../etc/passwd")).rejects.toThrow(ServiceRequestNotFoundError);
    expect(requestRepository.findById).toHaveBeenCalledWith("../../etc/passwd");
  });
});
