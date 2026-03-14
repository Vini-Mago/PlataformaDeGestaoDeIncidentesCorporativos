import { PrismaClient } from "../../../../generated/prisma-client/index.js";
import type {
  ServiceRequest,
  ServiceRequestComment,
  ServiceRequestStatus,
} from "../../../domain/entities/service-request.entity.js";
import type {
  IServiceRequestRepository,
  CreateServiceRequestData,
  ListServiceRequestsFilter,
} from "../../../application/ports/service-request-repository.port.js";

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

  async updateStatus(
    id: string,
    status: ServiceRequestStatus,
    meta?: { submittedAt?: Date; completedAt?: Date }
  ): Promise<ServiceRequest> {
    const row = await this.prisma.serviceRequestModel.update({
      where: { id },
      data: {
        status,
        ...(meta?.submittedAt && { submittedAt: meta.submittedAt }),
        ...(meta?.completedAt && { completedAt: meta.completedAt }),
      },
    });
    return this.toRequestEntity(row);
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
