import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client";
import type {
  AccessLogInput,
  AccessLogRecord,
  IAccessLogRepository,
  ListAccessLogsQuery,
} from "../../../application/ports/access-log-repository.port";

type AccessLogRow = {
  id: string;
  userId: string | null;
  identifier: string | null;
  ip: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
  eventType: string;
  result: string;
  statusCode: number;
  reason: string | null;
  createdAt: Date;
};

type PrismaAccessLogClientLike = {
  accessLogModel: {
    create: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
  $transaction: (queries: Promise<unknown>[]) => Promise<unknown[]>;
};

export class PrismaAccessLogRepository implements IAccessLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: AccessLogInput): Promise<void> {
    const prisma = this.prisma as unknown as PrismaAccessLogClientLike;
    await prisma.accessLogModel.create({
      data: {
        id: randomUUID(),
        userId: input.userId ?? null,
        identifier: input.identifier ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        method: input.method ?? null,
        path: input.path ?? null,
        eventType: input.eventType,
        result: input.result,
        statusCode: input.statusCode,
        reason: input.reason ?? null,
        createdAt: new Date(),
      },
    });
  }

  async list(query: ListAccessLogsQuery): Promise<{ items: AccessLogRecord[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where = {
      userId: query.userId,
      eventType: query.eventType,
      result: query.result,
      createdAt: {
        gte: query.from,
        lte: query.to,
      },
    };

    const prisma = this.prisma as unknown as PrismaAccessLogClientLike;
    const [total, rows] = await prisma.$transaction([
      prisma.accessLogModel.count({ where }),
      prisma.accessLogModel.findMany({
        where,
        orderBy: { createdAt: "desc" as const },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total: total as number,
      items: (rows as AccessLogRow[]).map((row) => ({
        id: row.id,
        userId: row.userId,
        identifier: row.identifier,
        ip: row.ip,
        userAgent: row.userAgent,
        method: row.method,
        path: row.path,
        eventType: row.eventType,
        result: row.result as "success" | "failure",
        statusCode: row.statusCode,
        reason: row.reason,
        createdAt: row.createdAt,
      })),
    };
  }
}
