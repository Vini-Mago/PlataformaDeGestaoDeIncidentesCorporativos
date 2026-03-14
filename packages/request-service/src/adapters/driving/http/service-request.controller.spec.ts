import { describe, it, expect, vi, beforeEach } from "vitest";
import { asyncHandler } from "@pgic/shared";
import { ServiceRequestController } from "./service-request.controller";
import type { CreateServiceRequestUseCase } from "../../../application/use-cases/create-service-request.use-case";
import type { ListServiceRequestsUseCase } from "../../../application/use-cases/list-service-requests.use-case";
import type { GetServiceRequestWithCommentsUseCase } from "../../../application/use-cases/get-service-request-with-comments.use-case";
import type { SubmitServiceRequestUseCase } from "../../../application/use-cases/submit-service-request.use-case";
import type { AddRequestCommentUseCase } from "../../../application/use-cases/add-request-comment.use-case";
import { InvalidStatusFilterError } from "../../../application/errors";

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

  const controller = () =>
    new ServiceRequestController(
      createServiceRequest,
      listServiceRequests,
      getServiceRequestWithComments,
      submitServiceRequest,
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
      } as any;
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      await controller().list(req, res);

      expect(listServiceRequests.execute).toHaveBeenCalledWith({
        requesterId: "user-1",
        status: "Submitted",
        catalogItemId: "cat-1",
      });
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("passes empty filters when query is empty", async () => {
      const req = { query: {} } as any;
      const res = { json: vi.fn() } as any;

      await controller().list(req, res);

      expect(listServiceRequests.execute).toHaveBeenCalledWith({
        requesterId: undefined,
        status: undefined,
        catalogItemId: undefined,
      });
    });

    it("throws InvalidStatusFilterError when status is invalid", async () => {
      const req = { query: { status: "InvalidStatus" } } as any;
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;
      const next = vi.fn();

      const listHandler = controller().list;
      const wrapped = asyncHandler(listHandler as any);
      await wrapped(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(InvalidStatusFilterError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid status filter: InvalidStatus" })
      );
    });
  });
});
