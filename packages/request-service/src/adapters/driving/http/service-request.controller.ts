import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@pgic/shared";
import type { CreateServiceRequestDto } from "../../../application/dtos/create-service-request.dto";
import type { AddRequestCommentDto } from "../../../application/dtos/add-request-comment.dto";
import type { CreateServiceRequestUseCase } from "../../../application/use-cases/create-service-request.use-case";
import type { ListServiceRequestsUseCase } from "../../../application/use-cases/list-service-requests.use-case";
import type { GetServiceRequestUseCase } from "../../../application/use-cases/get-service-request.use-case";
import type { SubmitServiceRequestUseCase } from "../../../application/use-cases/submit-service-request.use-case";
import type { AddRequestCommentUseCase } from "../../../application/use-cases/add-request-comment.use-case";
import type { IServiceRequestRepository } from "../../../application/ports/service-request-repository.port";
import type { ServiceRequestStatus } from "../../../domain/entities/service-request.entity";
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

function isRequestStatus(value: unknown): value is ServiceRequestStatus {
  return typeof value === "string" && REQUEST_STATUSES.includes(value as ServiceRequestStatus);
}

export class ServiceRequestController {
  constructor(
    private readonly createServiceRequest: CreateServiceRequestUseCase,
    private readonly listServiceRequests: ListServiceRequestsUseCase,
    private readonly getServiceRequest: GetServiceRequestUseCase,
    private readonly submitServiceRequest: SubmitServiceRequestUseCase,
    private readonly addRequestComment: AddRequestCommentUseCase,
    private readonly requestRepository: IServiceRequestRepository
  ) {}

  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (userId === undefined || userId === "") {
      res.status(401).json({ error: "Unauthenticated", message: "Missing authenticated user" });
      return;
    }
    const request = await this.createServiceRequest.execute(req.body as CreateServiceRequestDto, userId);
    res.status(201).json(request);
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const requesterId = req.query.requesterId as string | undefined;
    const statusParam = req.query.status;
    const catalogItemId = req.query.catalogItemId as string | undefined;
    if (statusParam !== undefined && statusParam !== "" && !isRequestStatus(statusParam)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid status filter" });
      return;
    }
    const status =
      statusParam === undefined || statusParam === "" ? undefined : (statusParam as ServiceRequestStatus);
    const list = await this.listServiceRequests.execute({
      requesterId,
      status,
      catalogItemId,
    });
    res.json(list);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const request = await this.getServiceRequest.execute(id);
    const comments = await this.requestRepository.getComments(id);
    res.json({ ...request, comments });
  });

  submit = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const request = await this.submitServiceRequest.execute(id);
    res.json(request);
  });

  addComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authorId = req.userId;
    if (authorId === undefined || authorId === "") {
      res.status(401).json({ error: "Unauthenticated", message: "Missing authenticated user" });
      return;
    }
    const { id } = req.params;
    const comment = await this.addRequestComment.execute(id, authorId, req.body as AddRequestCommentDto);
    res.status(201).json(comment);
  });
}
