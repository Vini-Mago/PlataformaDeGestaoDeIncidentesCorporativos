import { describe, it, expect, vi, beforeEach } from "vitest";
import { asyncHandler } from "@pgic/shared";
import type { AuthenticatedRequest } from "@pgic/shared";
import { ServiceRequestController } from "./service-request.controller";
import type { CreateServiceRequestUseCase } from "../../../application/use-cases/create-service-request.use-case";
import type { ListServiceRequestsUseCase } from "../../../application/use-cases/list-service-requests.use-case";
import type { GetServiceRequestWithCommentsUseCase } from "../../../application/use-cases/get-service-request-with-comments.use-case";
import type { SubmitServiceRequestUseCase } from "../../../application/use-cases/submit-service-request.use-case";
import type { AddRequestCommentUseCase } from "../../../application/use-cases/add-request-comment.use-case";
import type { SendForApprovalServiceRequestUseCase } from "../../../application/use-cases/send-for-approval-service-request.use-case";
import type { ApproveServiceRequestUseCase } from "../../../application/use-cases/approve-service-request.use-case";
import type { RejectServiceRequestUseCase } from "../../../application/use-cases/reject-service-request.use-case";
import type { StartServiceRequestUseCase } from "../../../application/use-cases/start-service-request.use-case";
import type { CompleteServiceRequestUseCase } from "../../../application/use-cases/complete-service-request.use-case";
import { InvalidStatusFilterError } from "../../../application/errors";

interface MockResponse {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

describe("ServiceRequestController", () => {
  let createServiceRequest: CreateServiceRequestUseCase;
  let listServiceRequests: ListServiceRequestsUseCase;
  let getServiceRequestWithComments: GetServiceRequestWithCommentsUseCase;
  let submitServiceRequest: SubmitServiceRequestUseCase;
  let addRequestComment: AddRequestCommentUseCase;

  beforeEach(() => {
    createServiceRequest = {
      execute: vi.fn(),
    };
    listServiceRequests = {
      execute: vi.fn().mockResolvedValue([]),
    };
    getServiceRequestWithComments = {
      execute: vi.fn(),
    };
    submitServiceRequest = {
      execute: vi.fn(),
    };
    addRequestComment = {
      execute: vi.fn(),
    };
  });

  const noopSendForApproval: SendForApprovalServiceRequestUseCase = { execute: vi.fn() };
  const noopApprove: ApproveServiceRequestUseCase = { execute: vi.fn() };
  const noopReject: RejectServiceRequestUseCase = { execute: vi.fn() };
  const noopStart: StartServiceRequestUseCase = { execute: vi.fn() };
  const noopComplete: CompleteServiceRequestUseCase = { execute: vi.fn() };

  const controller = () =>
    new ServiceRequestController(
      createServiceRequest,
      listServiceRequests,
      getServiceRequestWithComments,
      submitServiceRequest,
      noopSendForApproval,
      noopApprove,
      noopReject,
      noopStart,
      noopComplete,
      addRequestComment
    );

  describe("list", () => {
    it("passes query params to use case and returns 200", async () => {
      const req = {
        query: {
          requesterId: "user-1",
          status: "Submitted",
          catalogItemId: "cat-1",
        },
        userRole: "admin",
      } as unknown as AuthenticatedRequest;
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as MockResponse;

      await controller().list(req, res);

      expect(listServiceRequests.execute).toHaveBeenCalledWith({
        requesterId: "user-1",
        status: "Submitted",
        catalogItemId: "cat-1",
      });
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("passes empty filters when query is empty", async () => {
      const req = { query: {}, userRole: "admin" } as unknown as AuthenticatedRequest;
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as MockResponse;

      await controller().list(req, res);

      expect(listServiceRequests.execute).toHaveBeenCalledWith({
        requesterId: undefined,
        status: undefined,
        catalogItemId: undefined,
      });
    });

    it("throws InvalidStatusFilterError when status is invalid", async () => {
      const req = { query: { status: "InvalidStatus" }, userRole: "admin" } as unknown as AuthenticatedRequest;
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as MockResponse;
      const next = vi.fn();

      const listHandler = controller().list;
      const wrapped = asyncHandler(listHandler);
      await wrapped(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(InvalidStatusFilterError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid status filter: InvalidStatus" })
      );
    });
  });
});
