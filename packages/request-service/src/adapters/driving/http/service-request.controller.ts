import type { Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import {
  canReadAllServiceRequests,
  canUpdateAllServiceRequests,
  isServiceRequestParticipant,
} from "./service-request-access.helper";
import { ServiceRequestForbiddenError } from "../../../application/errors";
import type { CreateServiceRequestDto } from "../../../application/dtos/create-service-request.dto";
import type { AddRequestCommentDto } from "../../../application/dtos/add-request-comment.dto";
import type { RejectServiceRequestDto } from "../../../application/dtos/reject-service-request.dto";
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
import type { ServiceRequestStatus } from "../../../domain/entities/service-request.entity";
import { InvalidStatusFilterError } from "../../../application/errors";
import { asyncHandler } from "@pgic/shared";

const REQUEST_STATUSES: ServiceRequestStatus[] = [
  "Draft",
  "Submitted",
  "InApproval",
  "Approved",
  "Rejected",
  "InProgress",
  "Completed",
  "Cancelled",
];

function parseStatusFilter(value: unknown): ServiceRequestStatus | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !REQUEST_STATUSES.includes(value as ServiceRequestStatus)) {
    throw new InvalidStatusFilterError(String(value));
  }
  return value as ServiceRequestStatus;
}

export class ServiceRequestController {
  constructor(
    private readonly createServiceRequest: CreateServiceRequestUseCase,
    private readonly listServiceRequests: ListServiceRequestsUseCase,
    private readonly getServiceRequestWithComments: GetServiceRequestWithCommentsUseCase,
    private readonly submitServiceRequest: SubmitServiceRequestUseCase,
    private readonly sendForApprovalServiceRequest: SendForApprovalServiceRequestUseCase,
    private readonly approveServiceRequest: ApproveServiceRequestUseCase,
    private readonly rejectServiceRequest: RejectServiceRequestUseCase,
    private readonly startServiceRequest: StartServiceRequestUseCase,
    private readonly completeServiceRequest: CompleteServiceRequestUseCase,
    private readonly addRequestComment: AddRequestCommentUseCase
  ) {}

  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const request = await this.createServiceRequest.execute(req.body as CreateServiceRequestDto, req.userId);
    res.status(201).json(request);
  });

  list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = parseStatusFilter(req.query.status);
    const catalogItemId = req.query.catalogItemId as string | undefined;

    let requesterId = req.query.requesterId as string | undefined;
    if (!canReadAllServiceRequests(req)) {
      requesterId = req.userId;
    }

    const list = await this.listServiceRequests.execute({
      requesterId,
      status,
      catalogItemId,
    });
    res.json(list);
  });

  getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const request = await this.getServiceRequestWithComments.execute(id);
    if (!canReadAllServiceRequests(req)) {
      const uid = req.userId;
      if (!uid || !isServiceRequestParticipant(request, uid)) {
        throw new ServiceRequestForbiddenError();
      }
    }
    res.json(request);
  });

  submit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const uid = req.userId;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const existing = await this.getServiceRequestWithComments.execute(id);
    if (!canUpdateAllServiceRequests(req)) {
      if (!uid || !isServiceRequestParticipant(existing, uid)) {
        throw new ServiceRequestForbiddenError();
      }
    }
    const request = await this.submitServiceRequest.execute(id, uid);
    res.json(request);
  });

  sendForApproval = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const uid = req.userId;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const existing = await this.getServiceRequestWithComments.execute(id);
    if (!canUpdateAllServiceRequests(req)) {
      if (!uid || !isServiceRequestParticipant(existing, uid)) {
        throw new ServiceRequestForbiddenError();
      }
    }
    const request = await this.sendForApprovalServiceRequest.execute(id, uid);
    res.json(request);
  });

  approve = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const uid = req.userId;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const request = await this.approveServiceRequest.execute(id, uid, req.userRole);
    res.json(request);
  });

  reject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const uid = req.userId;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const body = req.body as RejectServiceRequestDto;
    const reason = body.reason?.trim() ? body.reason.trim() : null;
    const request = await this.rejectServiceRequest.execute(id, uid, req.userRole, reason);
    res.json(request);
  });

  start = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const uid = req.userId;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const request = await this.startServiceRequest.execute(id, uid);
    res.json(request);
  });

  complete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const uid = req.userId;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    const request = await this.completeServiceRequest.execute(id, uid);
    res.json(request);
  });

  addComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const uid = req.userId;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized: missing userId" });
      return;
    }
    if (!canUpdateAllServiceRequests(req)) {
      const existing = await this.getServiceRequestWithComments.execute(id);
      if (!uid || !isServiceRequestParticipant(existing, uid)) {
        throw new ServiceRequestForbiddenError();
      }
    }
    const comment = await this.addRequestComment.execute(id, uid, req.body as AddRequestCommentDto);
    res.status(201).json(comment);
  });
}
