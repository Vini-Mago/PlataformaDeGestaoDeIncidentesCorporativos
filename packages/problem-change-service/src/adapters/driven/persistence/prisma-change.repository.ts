import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client/index";
import type { Change, ChangeStatus } from "../../../domain/entities/change.entity";
import { VALID_CHANGE_STATUSES } from "../../../domain/entities/change.entity";
import type {
  IChangeRepository,
  CreateChangeInput,
  ChangeListFilters,
  UpdateChangePatch,
} from "../../../application/ports/change-repository.port";
import { CHANGE_CREATED_EVENT } from "@pgic/shared";

export class PrismaChangeRepository implements IChangeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateChangeInput): Promise<Change> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.changeModel.create({
        data: {
          title: input.title,
          description: input.description,
          justification: input.justification,
          changeType: input.changeType,
          risk: input.risk,
          status: "Draft",
          windowStart: input.windowStart ?? null,
          windowEnd: input.windowEnd ?? null,
          rollbackPlan: input.rollbackPlan ?? null,
          createdById: input.createdById,
        },
      });
      if (input.publishCreatedEvent) {
        await tx.outboxModel.create({
          data: {
            id: randomUUID(),
            eventName: CHANGE_CREATED_EVENT,
            payload: {
              changeId: row.id,
              title: row.title,
              status: row.status,
              risk: row.risk,
              changeType: row.changeType,
              createdById: row.createdById,
              occurredAt: row.createdAt.toISOString(),
            } as object,
            createdAt: new Date(),
          },
        });
      }
      return this.toChange(row);
    });
  }

  async findById(id: string): Promise<Change | null> {
    const row = await this.prisma.changeModel.findUnique({ where: { id } });
    return row ? this.toChange(row) : null;
  }

  async update(id: string, patch: UpdateChangePatch): Promise<Change | null> {
    const existing = await this.prisma.changeModel.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    const currentStatus = this.parseChangeStatus(existing.status);
    let completedAt = existing.completedAt;

    if (patch.status !== undefined && patch.status !== currentStatus) {
      const next = patch.status;
      if (next === "Completed" || next === "Rollback") {
        completedAt = completedAt ?? new Date();
      }
    }

    const row = await this.prisma.changeModel.update({
      where: { id },
      data: {
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.justification !== undefined && { justification: patch.justification }),
        ...(patch.changeType !== undefined && { changeType: patch.changeType }),
        ...(patch.risk !== undefined && { risk: patch.risk }),
        ...(patch.windowStart !== undefined && { windowStart: patch.windowStart }),
        ...(patch.windowEnd !== undefined && { windowEnd: patch.windowEnd }),
        ...(patch.rollbackPlan !== undefined && { rollbackPlan: patch.rollbackPlan }),
        completedAt,
      },
    });
    return this.toChange(row);
  }

  async list(filters: ChangeListFilters): Promise<Change[]> {
    const rows = await this.prisma.changeModel.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.createdById && { createdById: filters.createdById }),
        ...(filters.risk && { risk: filters.risk }),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toChange(r));
  }

  async getLinkedIncidentIds(changeId: string): Promise<string[]> {
    const rows = await this.prisma.changeLinkedIncidentModel.findMany({
      where: { changeId },
      select: { incidentId: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => r.incidentId);
  }

  async getLinkedProblemIds(changeId: string): Promise<string[]> {
    const rows = await this.prisma.changeLinkedProblemModel.findMany({
      where: { changeId },
      select: { problemId: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => r.problemId);
  }

  async linkIncident(changeId: string, incidentId: string): Promise<void> {
    await this.prisma.changeLinkedIncidentModel.upsert({
      where: {
        changeId_incidentId: { changeId, incidentId },
      },
      create: { changeId, incidentId },
      update: {},
    });
  }

  async unlinkIncident(changeId: string, incidentId: string): Promise<void> {
    await this.prisma.changeLinkedIncidentModel.deleteMany({
      where: { changeId, incidentId },
    });
  }

  async linkProblem(changeId: string, problemId: string): Promise<void> {
    await this.prisma.changeLinkedProblemModel.upsert({
      where: {
        changeId_problemId: { changeId, problemId },
      },
      create: { changeId, problemId },
      update: {},
    });
  }

  async unlinkProblem(changeId: string, problemId: string): Promise<void> {
    await this.prisma.changeLinkedProblemModel.deleteMany({
      where: { changeId, problemId },
    });
  }

  private parseChangeStatus(value: string): ChangeStatus {
    if (VALID_CHANGE_STATUSES.includes(value as ChangeStatus)) {
      return value as ChangeStatus;
    }
    throw new Error(`Invalid change status in database: "${value}"`);
  }

  private toChange(row: {
    id: string;
    title: string;
    description: string;
    justification: string;
    changeType: string;
    risk: string;
    status: string;
    windowStart: Date | null;
    windowEnd: Date | null;
    rollbackPlan: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  }): Change {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      justification: row.justification,
      changeType: row.changeType as Change["changeType"],
      risk: row.risk as Change["risk"],
      status: this.parseChangeStatus(row.status),
      windowStart: row.windowStart,
      windowEnd: row.windowEnd,
      rollbackPlan: row.rollbackPlan,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
    };
  }
}
