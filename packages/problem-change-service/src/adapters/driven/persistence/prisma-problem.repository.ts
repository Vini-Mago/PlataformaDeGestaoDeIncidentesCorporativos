import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client/index";
import type { Problem, ProblemStatus } from "../../../domain/entities/problem.entity";
import { VALID_PROBLEM_STATUSES } from "../../../domain/entities/problem.entity";
import type {
  IProblemRepository,
  CreateProblemInput,
  ProblemListFilters,
} from "../../../application/ports/problem-repository.port";
import { PROBLEM_CREATED_EVENT } from "@pgic/shared";

export class PrismaProblemRepository implements IProblemRepository {
  constructor(private readonly prisma: PrismaClient) {}

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
