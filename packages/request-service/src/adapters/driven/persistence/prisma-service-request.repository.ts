import { PrismaClient } from "../../../../generated/prisma-client/index.js";
import type {
  ServiceRequest,
  ServiceRequestComment,
  ServiceRequestStatus,
  ServiceRequestWorkflowEvent,
} from "../../../domain/entities/service-request.entity.js";
import type {
  IServiceRequestRepository,
  CreateServiceRequestData,
  ListServiceRequestsFilter,
  TransitionServiceRequestParams,
} from "../../../application/ports/service-request-repository.port.js";
import { ServiceRequestNotFoundError, InvalidStatusTransitionError } from "../../../application/errors.js";

export class PrismaServiceRequestRepository implements IServiceRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateServiceRequestData): Promise<ServiceRequest> {
    const row = await this.prisma.serviceRequestModel.create({
      data: {
        catalogItemId: data.catalogItemId,
        requesterId: data.requesterId,
        status: "Draft",
        formData: (data.formData ?? undefined) as object | undefined,
      },
    });
    return this.toRequestEntity(row);
  }

  async findById(id: string): Promise<ServiceRequest | null> {
    const row = await this.prisma.serviceRequestModel.findUnique({
      where: { id },
    });
    return row ? this.toRequestEntity(row) : null;
  }

  async list(filter: ListServiceRequestsFilter): Promise<ServiceRequest[]> {
    const rows = await this.prisma.serviceRequestModel.findMany({
      where: {
        ...(filter.requesterId && { requesterId: filter.requesterId }),
        ...(filter.status && { status: filter.status }),
        ...(filter.catalogItemId && { catalogItemId: filter.catalogItemId }),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toRequestEntity(r));
  }

  async transition(id: string, params: TransitionServiceRequestParams): Promise<ServiceRequest> {
    const allowed = new Set(params.allowedFromStatuses);
    return await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequestModel.findUnique({ where: { id } });
      if (!current) {
        throw new ServiceRequestNotFoundError(id);
      }
      if (!allowed.has(current.status as ServiceRequestStatus)) {
        throw new InvalidStatusTransitionError(current.status, params.toStatus);
      }
      const row = await tx.serviceRequestModel.update({
        where: { id },
        data: {
          status: params.toStatus,
          ...(params.submittedAt && { submittedAt: params.submittedAt }),
          ...(params.completedAt && { completedAt: params.completedAt }),
        },
      });
      await tx.serviceRequestWorkflowEventModel.create({
        data: {
          requestId: id,
          actorId: params.actorId,
          fromStatus: current.status,
          toStatus: params.toStatus,
          reason: params.reason ?? null,
        },
      });
      return this.toRequestEntity(row);
    });
  }

  async getWorkflowEvents(requestId: string): Promise<ServiceRequestWorkflowEvent[]> {
    const rows = await this.prisma.serviceRequestWorkflowEventModel.findMany({
      where: { requestId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      requestId: r.requestId,
      actorId: r.actorId,
      fromStatus: r.fromStatus as ServiceRequestStatus,
      toStatus: r.toStatus as ServiceRequestStatus,
      reason: r.reason,
      createdAt: r.createdAt,
    }));
  }

  async addComment(
    requestId: string,
    authorId: string,
    body: string
  ): Promise<ServiceRequestComment> {
    const row = await this.prisma.serviceRequestCommentModel.create({
      data: { requestId, authorId, body },
    });
    return {
      id: row.id,
      requestId: row.requestId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt,
    };
  }

  async getComments(requestId: string): Promise<ServiceRequestComment[]> {
    const rows = await this.prisma.serviceRequestCommentModel.findMany({
      where: { requestId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      requestId: r.requestId,
      authorId: r.authorId,
      body: r.body,
      createdAt: r.createdAt,
    }));
  }

  private toRequestEntity(row: {
    id: string;
    catalogItemId: string;
    requesterId: string;
    status: string;
    formData: unknown;
    assignedTeamId: string | null;
    assignedToId: string | null;
    submittedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ServiceRequest {
    return {
      id: row.id,
      catalogItemId: row.catalogItemId,
      requesterId: row.requesterId,
      status: row.status as ServiceRequestStatus,
      formData: row.formData as Record<string, unknown> | null,
      assignedTeamId: row.assignedTeamId,
      assignedToId: row.assignedToId,
      submittedAt: row.submittedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
