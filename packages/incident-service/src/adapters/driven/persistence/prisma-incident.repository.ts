import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client/index";
import { Prisma } from "../../../../generated/prisma-client/index";
import type { Incident } from "../../../domain/entities/incident.entity";
import type {
  IIncidentRepository,
  CreateIncidentInput,
  IncidentListFilters,
} from "../../../application/ports/incident-repository.port";
import { INCIDENT_CREATED_EVENT, INCIDENT_STATUS_CHANGED_EVENT, INCIDENT_ASSIGNED_EVENT } from "@pgic/shared";

export class PrismaIncidentRepository implements IIncidentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateIncidentInput): Promise<Incident> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.incidentModel.create({
        data: {
          title: input.title,
          description: input.description,
          status: "Open",
          criticality: input.criticality,
          serviceAffected: input.serviceAffected,
          requesterId: input.requesterId,
          assignedTeamId: input.assignedTeamId,
          assignedToId: input.assignedToId,
        },
      });
      if (input.publishCreatedEvent) {
        await tx.outboxModel.create({
          data: {
            id: randomUUID(),
            eventName: INCIDENT_CREATED_EVENT,
            payload: {
              incidentId: row.id,
              title: row.title,
              description: row.description,
              criticality: row.criticality,
              serviceAffected: row.serviceAffected,
              requesterId: row.requesterId,
              status: row.status,
              occurredAt: row.createdAt.toISOString(),
            } as object,
            createdAt: new Date(),
          },
        });
      }
      return this.toIncident(row);
    });
  }

  async findById(id: string): Promise<Incident | null> {
    const row = await this.prisma.incidentModel.findUnique({ where: { id } });
    return row ? this.toIncident(row) : null;
  }

  async findByIdWithComments(
    id: string
  ): Promise<
    (Incident & {
      comments: Array<{
        id: string;
        authorId: string;
        body: string;
        createdAt: Date;
      }>;
    }) | null
  > {
    const row = await this.prisma.incidentModel.findUnique({
      where: { id },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!row) return null;
    return {
      ...this.toIncident(row),
      comments: row.comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        body: c.body,
        createdAt: c.createdAt,
      })),
    };
  }

  async list(filters: IncidentListFilters): Promise<Incident[]> {
    const rows = await this.prisma.incidentModel.findMany({
      where: {
        ...(filters.requesterId && { requesterId: filters.requesterId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
        ...(filters.assignedTeamId && { assignedTeamId: filters.assignedTeamId }),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toIncident(r));
  }

  async updateStatus(
    id: string,
    toStatus: string,
    changedById: string | null,
    comment: string | null,
    publishStatusChangedEvent?: boolean
  ): Promise<Incident> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.incidentModel.findUnique({ where: { id } });
      if (!current) throw new Error("Incident not found");
      const resolvedAt = toStatus === "Resolved" ? new Date() : current.resolvedAt;
      const closedAt = toStatus === "Closed" ? new Date() : current.closedAt;
      const row = await tx.incidentModel.update({
        where: { id },
        data: {
          status: toStatus,
          resolvedAt,
          closedAt,
        },
      });
      await tx.incidentStatusHistoryModel.create({
        data: {
          incidentId: id,
          fromStatus: current.status,
          toStatus,
          changedById,
          comment,
        },
      });
      if (publishStatusChangedEvent) {
        await tx.outboxModel.create({
          data: {
            id: randomUUID(),
            eventName: INCIDENT_STATUS_CHANGED_EVENT,
            payload: {
              incidentId: id,
              fromStatus: current.status,
              toStatus,
              changedById,
              occurredAt: new Date().toISOString(),
            } as object,
            createdAt: new Date(),
          },
        });
      }
      return this.toIncident(row);
    });
  }

  async assign(
    id: string,
    assignedTeamId: string | null,
    assignedToId: string | null,
    publishAssignedEvent?: boolean
  ): Promise<Incident> {
    return this.prisma.$transaction(async (tx) => {
      let row;
      try {
        row = await tx.incidentModel.update({
          where: { id },
          data: { assignedTeamId, assignedToId },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
          throw new Error("Incident not found");
        }
        throw err;
      }
      if (publishAssignedEvent) {
        await tx.outboxModel.create({
          data: {
            id: randomUUID(),
            eventName: INCIDENT_ASSIGNED_EVENT,
            payload: {
              incidentId: id,
              assignedTeamId,
              assignedToId,
              occurredAt: new Date().toISOString(),
            } as object,
            createdAt: new Date(),
          },
        });
      }
      return this.toIncident(row);
    });
  }

  async addComment(
    incidentId: string,
    authorId: string,
    body: string
  ): Promise<{ id: string; incidentId: string; authorId: string; body: string; createdAt: Date }> {
    const row = await this.prisma.incidentCommentModel.create({
      data: { incidentId, authorId, body },
    });
    return {
      id: row.id,
      incidentId: row.incidentId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt,
    };
  }

  private toIncident(row: {
    id: string;
    title: string;
    description: string;
    status: string;
    criticality: string;
    serviceAffected: string | null;
    requesterId: string;
    assignedTeamId: string | null;
    assignedToId: string | null;
    problemId: string | null;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt: Date | null;
    closedAt: Date | null;
  }): Incident {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as Incident["status"],
      criticality: row.criticality as Incident["criticality"],
      serviceAffected: row.serviceAffected,
      requesterId: row.requesterId,
      assignedTeamId: row.assignedTeamId,
      assignedToId: row.assignedToId,
      problemId: row.problemId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      resolvedAt: row.resolvedAt,
      closedAt: row.closedAt,
    };
  }
}
