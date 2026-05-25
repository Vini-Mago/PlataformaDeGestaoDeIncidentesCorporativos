import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client/index";
import type { Problem, ProblemStatus } from "../../../domain/entities/problem.entity";
import type { UpdateProblemPatch } from "../../../application/ports/problem-repository.port";
import { VALID_PROBLEM_STATUSES } from "../../../domain/entities/problem.entity";
import type {
  IProblemRepository,
  CreateProblemInput,
  ProblemListFilters,
} from "../../../application/ports/problem-repository.port";
import { PROBLEM_CREATED_EVENT, PROBLEM_INCIDENT_LINKED_EVENT, PROBLEM_INCIDENT_UNLINKED_EVENT } from "@pgic/shared";

export class PrismaProblemRepository implements IProblemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async writeIncidentLinkOutboxEvent(
    tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
    eventName: string,
    problemId: string,
    incidentId: string
  ): Promise<void> {
    await tx.outboxModel.create({
      data: {
        id: randomUUID(),
        eventName,
        payload: {
          problemId,
          incidentId,
          occurredAt: new Date().toISOString(),
        } as object,
        createdAt: new Date(),
      },
    });
  }

  async create(input: CreateProblemInput): Promise<Problem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.problemModel.create({
        data: {
          title: input.title,
          description: input.description,
          status: "Open",
          rootCause: input.rootCause ?? null,
          actionPlan: input.actionPlan ?? null,
          createdById: input.createdById,
        },
      });
      if (input.publishCreatedEvent) {
        await tx.outboxModel.create({
          data: {
            id: randomUUID(),
            eventName: PROBLEM_CREATED_EVENT,
            payload: {
              problemId: row.id,
              title: row.title,
              status: row.status,
              createdById: row.createdById,
              occurredAt: row.createdAt.toISOString(),
            } as object,
            createdAt: new Date(),
          },
        });
      }
      return this.toProblem(row);
    });
  }

  async findById(id: string): Promise<Problem | null> {
    const row = await this.prisma.problemModel.findUnique({ where: { id } });
    return row ? this.toProblem(row) : null;
  }

  async update(id: string, patch: UpdateProblemPatch): Promise<Problem | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.problemModel.findUnique({ where: { id } });
      if (!existing) {
        return null;
      }
      const currentStatus = this.parseProblemStatus(existing.status);
      let resolvedAt = existing.resolvedAt;
      let closedAt = existing.closedAt;

      if (patch.status !== undefined && patch.status !== currentStatus) {
        const next = patch.status;
        if (next === "Resolved") {
          resolvedAt = resolvedAt ?? new Date();
        }
        if (next === "Closed") {
          closedAt = closedAt ?? new Date();
        }
        if (currentStatus === "Closed" && (next === "Open" || next === "InAnalysis")) {
          closedAt = null;
        }
        if (currentStatus === "Resolved" && next !== "Resolved" && next !== "Closed") {
          resolvedAt = null;
        }
      }

      const row = await tx.problemModel.update({
        where: { id },
        data: {
          ...(patch.status !== undefined && { status: patch.status }),
          ...(patch.rootCause !== undefined && { rootCause: patch.rootCause }),
          ...(patch.actionPlan !== undefined && { actionPlan: patch.actionPlan }),
          resolvedAt,
          closedAt,
        },
      });

      const hasTrackedChange =
        existing.status !== row.status ||
        existing.rootCause !== row.rootCause ||
        existing.actionPlan !== row.actionPlan;

      if (hasTrackedChange) {
        const versionCount = await tx.problemVersionModel.count({
          where: { problemId: id },
        });
        await tx.problemVersionModel.create({
          data: {
            problemId: id,
            versionNumber: versionCount + 1,
            changedById: patch.changedById ?? null,
            snapshot: {
              before: {
                status: existing.status,
                rootCause: existing.rootCause,
                actionPlan: existing.actionPlan,
              },
              after: {
                status: row.status,
                rootCause: row.rootCause,
                actionPlan: row.actionPlan,
              },
            } as object,
          },
        });
      }

      return this.toProblem(row);
    });
  }

  async list(filters: ProblemListFilters): Promise<Problem[]> {
    const rows = await this.prisma.problemModel.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.createdById && { createdById: filters.createdById }),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toProblem(r));
  }

  async getLinkedIncidentIds(problemId: string): Promise<string[]> {
    const rows = await this.prisma.problemLinkedIncidentModel.findMany({
      where: { problemId },
      select: { incidentId: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => r.incidentId);
  }

  async listLinksForIncidents(
    incidentIds: string[]
  ): Promise<Array<{ incidentId: string; problemId: string; problemTitle: string }>> {
    if (incidentIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.problemLinkedIncidentModel.findMany({
      where: { incidentId: { in: incidentIds } },
      include: {
        problem: { select: { id: true, title: true } },
      },
    });
    return rows.map((r) => ({
      incidentId: r.incidentId,
      problemId: r.problemId,
      problemTitle: r.problem.title,
    }));
  }

  async linkIncident(problemId: string, incidentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.problemLinkedIncidentModel.deleteMany({
        where: { incidentId },
      });
      await tx.problemLinkedIncidentModel.create({
        data: { problemId, incidentId },
      });
      await this.writeIncidentLinkOutboxEvent(tx, PROBLEM_INCIDENT_LINKED_EVENT, problemId, incidentId);
    });
  }

  async unlinkIncident(problemId: string, incidentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.problemLinkedIncidentModel.deleteMany({
        where: { problemId, incidentId },
      });
      await this.writeIncidentLinkOutboxEvent(tx, PROBLEM_INCIDENT_UNLINKED_EVENT, problemId, incidentId);
    });
  }

  private parseProblemStatus(value: string): ProblemStatus {
    if (VALID_PROBLEM_STATUSES.includes(value as ProblemStatus)) {
      return value as ProblemStatus;
    }
    throw new Error(`Invalid problem status in database: "${value}". Expected one of: ${VALID_PROBLEM_STATUSES.join(", ")}`);
  }

  private toProblem(row: {
    id: string;
    title: string;
    description: string;
    status: string;
    rootCause: string | null;
    actionPlan: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt: Date | null;
    closedAt: Date | null;
  }): Problem {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: this.parseProblemStatus(row.status),
      rootCause: row.rootCause,
      actionPlan: row.actionPlan,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      resolvedAt: row.resolvedAt,
      closedAt: row.closedAt,
    };
  }
}
