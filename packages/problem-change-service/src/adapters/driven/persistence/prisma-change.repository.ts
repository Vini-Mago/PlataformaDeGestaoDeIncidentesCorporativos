import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client/index";
import type { Change } from "../../../domain/entities/change.entity";
import type {
  IChangeRepository,
  CreateChangeInput,
  ChangeListFilters,
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
      status: row.status as Change["status"],
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
